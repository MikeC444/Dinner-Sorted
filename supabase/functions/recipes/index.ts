// The app's single recipe endpoint. Combines Spoonacular, TheMealDB and Edamam,
// applies the person's allergies, diet and tastes, and enforces the free plan.
//
// POST body: { action: 'search' | 'suggest' | 'pantry' | 'detail' | 'plan' | 'usage', ... }

import {
  ALLERGENS, DEFAULT_TASTES, FREE_KITCHEN_SEARCHES_PER_DAY, isFreeRecipe, matchPantry, suits, tasteScore,
} from '../_shared/domain.ts';
import type { AllergenKey, Diet, FoodPrefs, PantryMatch, Recipe, Tastes } from '../_shared/domain.ts';
import { dedupe, edSearch, fetchById, mdbByIngredient, mdbSearch, spByIngredients, spSearch } from '../_shared/providers.ts';
import type { SearchParams } from '../_shared/providers.ts';
import { adminClient, corsHeaders, json, requestUser } from '../_shared/supabase.ts';

type Card = Recipe & { match?: PantryMatch; reason?: string };

const CACHE_TTL_HOURS = Number(Deno.env.get('CACHE_TTL_HOURS') || '1');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await requestUser(req);
  if (!user) return json({ error: 'unauthorised' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const db = adminClient();
  const [{ data: profile }, { data: premiumData }] = await Promise.all([
    db.from('profiles').select('diet, allergies, allergy_other, tastes').eq('id', user.id).maybeSingle(),
    db.rpc('has_premium', { uid: user.id }),
  ]);
  const premium = premiumData === true;
  const prefs: FoodPrefs = {
    diet: (profile?.diet as Diet) || 'all',
    allergies: ((profile?.allergies || []) as string[]).filter((a): a is AllergenKey => ALLERGENS.some((x) => x.key === a)),
    allergyOther: (profile?.allergy_other || []) as string[],
    tastes: { ...DEFAULT_TASTES, ...((profile?.tastes || {}) as Partial<Tastes>) },
  };
  const base: SearchParams = { vegan: prefs.diet === 'vegan', vegetarian: prefs.diet === 'veg' };

  // Strip what the person's plan doesn't include. Locked recipes keep enough to tempt, not to cook.
  const present = (r: Card): Card => {
    const locked = !premium && !isFreeRecipe(r.id);
    const n = r.nutrition;
    if (locked) {
      return { ...r, locked: true, steps: [], nutrition: n ? { kcal: n.kcal, protein: 0, carbs: 0, fat: 0 } : undefined };
    }
    if (!premium && n) {
      return { ...r, locked: false, nutrition: { kcal: n.kcal, protein: n.protein, carbs: n.carbs, fat: n.fat } };
    }
    return { ...r, locked: false };
  };

  const cache = async (list: Recipe[]) => {
    if (!list.length) return;
    await db.from('recipe_cache').upsert(list.map((r) => ({ id: r.id, data: r, fetched_at: new Date().toISOString() })));
  };

  const rank = (list: Recipe[], pantry: string[] = []): Card[] =>
    list.filter((r) => suits(r, prefs)).map((r) => {
      const t = tasteScore(r, prefs.tastes);
      return { ...r, reason: t.reason, match: pantry.length ? matchPantry(r, pantry) : undefined, _score: t.score } as Card & { _score: number };
    });

  try {
    switch (body.action) {
      // ------------------------------------------------------------------ usage
      case 'usage': {
        const { data } = await db.from('usage_counters').select('kitchen_searches')
          .eq('user_id', user.id).eq('day', new Date().toISOString().slice(0, 10)).maybeSingle();
        const used = data?.kitchen_searches || 0;
        return json({ premium, kitchenSearchesLeft: premium ? null : Math.max(0, FREE_KITCHEN_SEARCHES_PER_DAY - used) });
      }

      // ----------------------------------------------------------------- search
      case 'search': {
        const f = body.filters || {};
        const page = Math.max(0, Number(body.page) || 0);
        const p: SearchParams = {
          ...base, query: body.query ? String(body.query).slice(0, 80) : undefined,
          cuisine: body.cuisine || undefined, maxMinutes: f.quick ? 30 : undefined, maxCalories: f.light ? 500 : undefined,
          number: 20, offset: page * 20,
        };
        if (f.vegan) p.vegan = true;
        if (f.vegetarian) p.vegetarian = true;
        const [sp, mdb, ed] = await Promise.all([spSearch(p, prefs.allergies), page === 0 ? mdbSearch(p) : Promise.resolve([]), edSearch(p, user.id)]);
        const all = dedupe([...sp, ...ed, ...mdb]);
        await cache(all);
        let list = rank(all);
        if (f.quick) list = list.filter((r) => !r.minutes || r.minutes <= 30);
        if (f.light) list = list.filter((r) => !r.nutrition || r.nutrition.kcal < 500);
        if (f.vegan) list = list.filter((r) => r.vegan);
        if (f.vegetarian) list = list.filter((r) => r.vegetarian);
        if (premium) {
          if (f.highProtein) list = list.filter((r) => (r.nutrition?.protein || 0) >= 30);
          if (f.lowCarb) list = list.filter((r) => r.nutrition !== undefined && r.nutrition.carbs <= 30);
          if (f.under10) list = list.filter((r) => r.ingredients.length <= 10);
        }
        list.sort((a: any, b: any) => b._score - a._score);
        return json({ recipes: list.map(present), hasMore: sp.length >= 20 });
      }

      // ---------------------------------------------------------------- suggest
      case 'suggest': {
        const pantry: string[] = (body.pantry || []).map(String).slice(0, 40);
        const favs = prefs.tastes.cuisines;
        const p: SearchParams = { ...base, random: true, number: 20, cuisine: favs.length ? favs.join(',') : undefined };
        const [sp, byPantry, ed, mdb] = await Promise.all([
          spSearch(p, prefs.allergies),
          spByIngredients(pantry.slice(0, 8), 10),
          edSearch({ ...base, random: true, cuisine: favs[0] }, user.id),
          mdbSearch({ cuisine: favs[0] }),
        ]);
        const all = dedupe([...byPantry, ...sp, ...ed, ...mdb]);
        await cache(all);
        const list = rank(all, pantry).sort((a: any, b: any) => {
          const lockA = !premium && !isFreeRecipe(a.id) ? 1 : 0;
          const lockB = !premium && !isFreeRecipe(b.id) ? 1 : 0;
          if (lockA !== lockB) return lockA - lockB; // openable picks first on the free plan
          return (b._score * 25 + (b.match?.pct || 0)) - (a._score * 25 + (a.match?.pct || 0));
        });
        return json({ recipes: list.slice(0, 12).map(present) });
      }

      // ----------------------------------------------------------------- pantry
      case 'pantry': {
        const pantry: string[] = (body.pantry || []).map(String).filter(Boolean).slice(0, 60);
        if (!pantry.length) return json({ error: 'empty_pantry' }, 400);
        if (!premium) {
          const { data: ok } = await db.rpc('use_kitchen_search', { uid: user.id, daily_limit: FREE_KITCHEN_SEARCHES_PER_DAY });
          if (!ok) return json({ error: 'limit_reached', kitchenSearchesLeft: 0 }, 402);
        }
        const mains = pantry.filter((t) => /chicken|beef|pork|lamb|salmon|prawn|tofu|egg|bean|lentil|chickpea|mince|fish|turkey|sausage/.test(t));
        const [sp, mdb, ed] = await Promise.all([
          spByIngredients(pantry, 24),
          mdbByIngredient(mains[0] || pantry[0]),
          edSearch({ ...base, query: pantry.slice(0, 4).join(' ') }, user.id),
        ]);
        const all = dedupe([...sp, ...mdb, ...ed]);
        await cache(all);
        const list = rank(all, pantry)
          .filter((r) => (r.match?.have || 0) > 0)
          .sort((a: any, b: any) => (b.match!.pct - a.match!.pct) || (b._score - a._score));
        let left: number | null = null;
        if (!premium) {
          const { data } = await db.from('usage_counters').select('kitchen_searches')
            .eq('user_id', user.id).eq('day', new Date().toISOString().slice(0, 10)).maybeSingle();
          left = Math.max(0, FREE_KITCHEN_SEARCHES_PER_DAY - (data?.kitchen_searches || 0));
        }
        return json({ recipes: list.slice(0, 24).map(present), kitchenSearchesLeft: left });
      }

      // ----------------------------------------------------------------- detail
      case 'detail': {
        const id = String(body.id || '');
        if (!/^(sp|mdb|ed):[\w-]+$/.test(id)) return json({ error: 'bad_id' }, 400);
        const since = new Date(Date.now() - CACHE_TTL_HOURS * 3600_000).toISOString();
        const { data: cached } = await db.from('recipe_cache').select('data').eq('id', id).gte('fetched_at', since).maybeSingle();
        let recipe: Recipe | null = (cached?.data as Recipe | undefined) ?? null;
        if (!recipe) {
          recipe = await fetchById(id, user.id);
          if (recipe) await cache([recipe]);
        }
        if (!recipe) return json({ error: 'not_found' }, 404);
        const shown = present(recipe);
        if (shown.locked) return json({ error: 'premium', recipe: shown }, 402);
        const warnings: string[] = [];
        const hit = recipe.allergens.filter((a) => prefs.allergies.includes(a));
        if (hit.length) {
          warnings.push('Contains ' + hit.map((a) => ALLERGENS.find((x) => x.key === a)!.label.toLowerCase()).join(', ') + ', which you told us to avoid.');
        } else if (!suits(recipe, prefs)) {
          warnings.push("This doesn't match your food preferences.");
        }
        return json({ recipe: shown, warnings });
      }

      // ------------------------------------------------------------------- plan
      case 'plan': {
        if (!premium) return json({ error: 'premium' }, 402);
        const budget = Math.min(1500, Math.max(250, Number(body.dinnerBudget) || 600));
        const pantry: string[] = (body.pantry || []).map(String).slice(0, 40);
        const [sp, ed] = await Promise.all([
          spSearch({ ...base, random: true, number: 40, maxCalories: budget }, prefs.allergies),
          edSearch({ ...base, random: true, maxCalories: budget, number: 20 }, user.id),
        ]);
        const all = dedupe([...sp, ...ed]);
        await cache(all);
        const ranked = rank(all, pantry)
          .filter((r) => !r.nutrition || r.nutrition.kcal <= budget)
          .sort((a: any, b: any) => (b._score * 25 + (b.match?.pct || 0)) - (a._score * 25 + (a.match?.pct || 0)));
        // Pick 7 with as much cuisine variety as possible.
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const chosen: Card[] = [];
        const usedCuisine = new Set<string>();
        for (const r of ranked) { if (chosen.length < 7 && !usedCuisine.has(r.cuisine || r.id)) { chosen.push(r); usedCuisine.add(r.cuisine || r.id); } }
        for (const r of ranked) { if (chosen.length < 7 && !chosen.includes(r)) chosen.push(r); }
        const plan = chosen.map((r, i) => ({ day: days[i], recipe: present(r) }));
        const now = new Date();
        const monday = new Date(now); monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
        await db.from('meal_plans').upsert({ user_id: user.id, week_start: monday.toISOString().slice(0, 10), days: plan });
        return json({ days: plan });
      }

      default:
        return json({ error: 'unknown_action' }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});
