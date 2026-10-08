// Recipe providers: Spoonacular, TheMealDB and Edamam, normalised into one Recipe shape.
// Each provider is optional: if its keys aren't set it is skipped.
// Check each provider's terms for caching, attribution and commercial use before launch.

import { enrichRecipe, key } from './domain.ts';
import type { AllergenKey, Ingredient, Nutrition, Recipe } from './domain.ts';

const TIMEOUT_MS = 8000;

async function getJson(url: string, headers: Record<string, string> = {}): Promise<any | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      console.warn('provider error', res.status, url.replace(/(apiKey|app_key|app_id)=[^&]+/g, '$1=***'));
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn('provider fetch failed', String(e));
    return null;
  }
}

const env = (k: string) => Deno.env.get(k) || '';

export interface SearchParams {
  query?: string;
  cuisine?: string;          // one of CUISINES
  maxMinutes?: number;
  maxCalories?: number;
  vegetarian?: boolean;
  vegan?: boolean;
  number?: number;
  offset?: number;
  random?: boolean;
}

// ---------------- Spoonacular ----------------

const SP = 'https://api.spoonacular.com';
const SP_CUISINE: Record<string, string> = { 'West African': 'African' };
const SP_INTOLERANCE: Partial<Record<AllergenKey, string>> = {
  gluten: 'Gluten', milk: 'Dairy', eggs: 'Egg', peanuts: 'Peanut', nuts: 'Tree Nut', crustaceans: 'Shellfish',
  molluscs: 'Shellfish', fish: 'Seafood', soya: 'Soy', sesame: 'Sesame', sulphites: 'Sulfite',
};

function spNutrition(n: any): Nutrition | undefined {
  const list: any[] = n?.nutrients;
  if (!Array.isArray(list)) return undefined;
  const get = (name: string) => list.find((x) => x.name === name)?.amount;
  const sodiumMg = get('Sodium');
  const micros = list
    .filter((x) => ['Iron', 'Calcium', 'Vitamin C', 'Vitamin B12', 'Vitamin D', 'Potassium', 'Magnesium', 'Folate'].includes(x.name))
    .map((x) => ({ name: x.name, amount: Math.round(x.amount * 10) / 10, unit: x.unit }));
  return {
    kcal: Math.round(get('Calories') || 0),
    protein: Math.round(get('Protein') || 0),
    carbs: Math.round(get('Carbohydrates') || 0),
    fat: Math.round(get('Fat') || 0),
    fibre: get('Fiber') !== undefined ? Math.round(get('Fiber')) : undefined,
    sugars: get('Sugar') !== undefined ? Math.round(get('Sugar')) : undefined,
    satFat: get('Saturated Fat') !== undefined ? Math.round(get('Saturated Fat') * 10) / 10 : undefined,
    salt: sodiumMg !== undefined ? Math.round((sodiumMg * 2.5) / 100) / 10 : undefined,
    micros,
  };
}

export function spRecipe(r: any): Recipe | null {
  if (!r?.id || !r?.title) return null;
  const steps: string[] = (r.analyzedInstructions?.[0]?.steps || []).map((s: any) => String(s.step).trim()).filter(Boolean);
  const ingredients: Ingredient[] = (r.extendedIngredients || []).map((i: any) => ({
    name: i.nameClean || i.name || i.original, original: i.original || i.name, amount: i.amount, unit: i.unit,
  }));
  const contains: AllergenKey[] = [];
  if (r.glutenFree === false) contains.push('gluten');
  if (r.dairyFree === false) contains.push('milk');
  const cuisine = (r.cuisines && r.cuisines[0]) || undefined;
  return enrichRecipe({
    id: 'sp:' + r.id, source: 'spoonacular', sourceName: r.sourceName, sourceUrl: r.sourceUrl,
    title: r.title, image: r.image, cuisine: cuisine === 'African' ? 'West African' : cuisine,
    minutes: r.readyInMinutes, servings: r.servings || 2, ingredients, steps, nutrition: spNutrition(r.nutrition),
  }, contains);
}

export async function spSearch(p: SearchParams, avoidAllergens: AllergenKey[]): Promise<Recipe[]> {
  const apiKey = env('SPOONACULAR_API_KEY');
  if (!apiKey) return [];
  const q = new URLSearchParams({
    apiKey, number: String(p.number ?? 20), offset: String(p.offset ?? 0),
    addRecipeInformation: 'true', addRecipeNutrition: 'true', fillIngredients: 'true', instructionsRequired: 'true',
    type: 'main course', sort: p.random ? 'random' : 'popularity',
  });
  if (p.query) q.set('query', p.query);
  if (p.cuisine) q.set('cuisine', p.cuisine.split(',').map((c) => SP_CUISINE[c.trim()] || c.trim()).join(','));
  if (p.maxMinutes) q.set('maxReadyTime', String(p.maxMinutes));
  if (p.maxCalories) q.set('maxCalories', String(p.maxCalories));
  if (p.vegan) q.set('diet', 'vegan'); else if (p.vegetarian) q.set('diet', 'vegetarian');
  const intolerances = Array.from(new Set(avoidAllergens.map((a) => SP_INTOLERANCE[a]).filter(Boolean)));
  if (intolerances.length) q.set('intolerances', intolerances.join(','));
  const data = await getJson(`${SP}/recipes/complexSearch?${q}`);
  return (data?.results || []).map(spRecipe).filter(Boolean) as Recipe[];
}

export async function spByIngredients(ingredients: string[], number = 20): Promise<Recipe[]> {
  const apiKey = env('SPOONACULAR_API_KEY');
  if (!apiKey || !ingredients.length) return [];
  const q = new URLSearchParams({ apiKey, ingredients: ingredients.slice(0, 20).join(','), number: String(number), ranking: '1', ignorePantry: 'true' });
  const found = await getJson(`${SP}/recipes/findByIngredients?${q}`);
  const ids = (found || []).map((x: any) => x.id).filter(Boolean);
  if (!ids.length) return [];
  const bulk = await getJson(`${SP}/recipes/informationBulk?${new URLSearchParams({ apiKey, ids: ids.join(','), includeNutrition: 'true' })}`);
  return (bulk || []).map(spRecipe).filter(Boolean) as Recipe[];
}

export async function spById(id: string): Promise<Recipe | null> {
  const apiKey = env('SPOONACULAR_API_KEY');
  if (!apiKey) return null;
  const data = await getJson(`${SP}/recipes/${encodeURIComponent(id)}/information?${new URLSearchParams({ apiKey, includeNutrition: 'true' })}`);
  return data ? spRecipe(data) : null;
}

// ---------------- TheMealDB ----------------

const mdbBase = () => `https://www.themealdb.com/api/json/v1/${env('THEMEALDB_API_KEY') || '1'}`;
const MDB_AREA: Record<string, string> = {
  British: 'British', Italian: 'Italian', Indian: 'Indian', Chinese: 'Chinese', Mexican: 'Mexican', Thai: 'Thai',
  Japanese: 'Japanese', French: 'French', Spanish: 'Spanish', Greek: 'Greek', Caribbean: 'Jamaican', American: 'American',
  Vietnamese: 'Vietnamese',
};
const MDB_AREA_BACK: Record<string, string> = { Jamaican: 'Caribbean' };
const MDB_SKIP_CATEGORIES = ['Dessert', 'Breakfast', 'Starter', 'Side'];

export function mdbRecipe(m: any): Recipe | null {
  if (!m?.idMeal || MDB_SKIP_CATEGORIES.includes(m.strCategory)) return null;
  const ingredients: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = String(m['strIngredient' + i] || '').trim();
    if (!name) continue;
    const measure = String(m['strMeasure' + i] || '').trim();
    ingredients.push({ name: name.toLowerCase(), original: (measure ? measure + ' ' : '') + name.toLowerCase() });
  }
  const steps = String(m.strInstructions || '')
    .split(/\r?\n+/)
    .map((s) => s.replace(/^\s*(step\s*\d+[:.)]?|\d+[.)])\s*/i, '').trim())
    .filter((s) => s.length > 3);
  return enrichRecipe({
    id: 'mdb:' + m.idMeal, source: 'themealdb', sourceName: 'TheMealDB', sourceUrl: m.strSource || undefined,
    title: m.strMeal, image: m.strMealThumb, cuisine: MDB_AREA_BACK[m.strArea] || m.strArea,
    servings: 4, ingredients, steps,
  });
}

async function mdbLookupMany(ids: string[]): Promise<Recipe[]> {
  const meals = await Promise.all(ids.slice(0, 8).map((id) => getJson(`${mdbBase()}/lookup.php?i=${encodeURIComponent(id)}`)));
  return meals.map((d) => mdbRecipe(d?.meals?.[0])).filter(Boolean) as Recipe[];
}

export async function mdbSearch(p: SearchParams): Promise<Recipe[]> {
  if (p.query) {
    const d = await getJson(`${mdbBase()}/search.php?s=${encodeURIComponent(p.query)}`);
    return (d?.meals || []).map(mdbRecipe).filter(Boolean) as Recipe[];
  }
  if (p.cuisine && MDB_AREA[p.cuisine]) {
    const d = await getJson(`${mdbBase()}/filter.php?a=${encodeURIComponent(MDB_AREA[p.cuisine])}`);
    const ids = (d?.meals || []).map((m: any) => m.idMeal);
    const start = (p.offset || 0) % Math.max(ids.length, 1);
    return mdbLookupMany(ids.slice(start, start + 8));
  }
  const randoms = await Promise.all(Array.from({ length: 6 }, () => getJson(`${mdbBase()}/random.php`)));
  return randoms.map((d) => mdbRecipe(d?.meals?.[0])).filter(Boolean) as Recipe[];
}

export async function mdbByIngredient(ingredient: string): Promise<Recipe[]> {
  const d = await getJson(`${mdbBase()}/filter.php?i=${encodeURIComponent(key(ingredient).replace(/ /g, '_'))}`);
  return mdbLookupMany((d?.meals || []).map((m: any) => m.idMeal));
}

export async function mdbById(id: string): Promise<Recipe | null> {
  const d = await getJson(`${mdbBase()}/lookup.php?i=${encodeURIComponent(id)}`);
  return mdbRecipe(d?.meals?.[0]);
}

// ---------------- Edamam ----------------

const ED = 'https://api.edamam.com/api/recipes/v2';
const ED_CUISINE: Record<string, string> = {
  British: 'british', Italian: 'italian', Indian: 'indian', Chinese: 'chinese', Mexican: 'mexican', Thai: 'south east asian',
  Vietnamese: 'south east asian', Japanese: 'japanese', Korean: 'korean', 'Middle Eastern': 'middle eastern',
  Mediterranean: 'mediterranean', French: 'french', Greek: 'mediterranean', Spanish: 'mediterranean',
  Caribbean: 'caribbean', American: 'american',
};
const ED_FREE_LABEL: Record<string, AllergenKey> = {
  'Gluten-Free': 'gluten', 'Dairy-Free': 'milk', 'Egg-Free': 'eggs', 'Peanut-Free': 'peanuts', 'Tree-Nut-Free': 'nuts',
  'Fish-Free': 'fish', 'Crustacean-Free': 'crustaceans', 'Mollusk-Free': 'molluscs', 'Soy-Free': 'soya',
  'Sesame-Free': 'sesame', 'Mustard-Free': 'mustard', 'Celery-Free': 'celery', 'Sulfite-Free': 'sulphites', 'Lupine-Free': 'lupin',
};
const ALL_ED_ALLERGENS = Object.values(ED_FREE_LABEL);

function titleCase(s: string) { return s.replace(/\b\w/g, (c) => c.toUpperCase()); }

export function edRecipe(r: any): Recipe | null {
  if (!r?.uri) return null;
  const id = String(r.uri).split('#recipe_')[1];
  if (!id) return null;
  const yieldN = r.yield || 2;
  const n = r.totalNutrients || {};
  const per = (k: string) => (n[k]?.quantity !== undefined ? n[k].quantity / yieldN : undefined);
  const labels: string[] = r.healthLabels || [];
  // Conservative: anything Edamam doesn't certify as "-Free" is treated as present.
  const contains = ALL_ED_ALLERGENS.filter((a) => !labels.some((l) => ED_FREE_LABEL[l] === a));
  const cuisineRaw: string | undefined = r.cuisineType?.[0];
  return enrichRecipe({
    id: 'ed:' + id, source: 'edamam', sourceName: r.source, sourceUrl: r.url,
    title: r.label, image: r.images?.REGULAR?.url || r.image,
    cuisine: cuisineRaw ? titleCase(cuisineRaw === 'south east asian' ? 'Thai' : cuisineRaw) : undefined,
    minutes: r.totalTime || undefined, servings: yieldN,
    ingredients: (r.ingredients || []).map((i: any) => ({ name: i.food || i.text, original: i.text, amount: i.quantity, unit: i.measure })),
    steps: [], // Edamam doesn't supply the method: the app links to the source.
    nutrition: {
      kcal: Math.round((r.calories || 0) / yieldN), protein: Math.round(per('PROCNT') || 0), carbs: Math.round(per('CHOCDF') || 0),
      fat: Math.round(per('FAT') || 0), fibre: per('FIBTG') !== undefined ? Math.round(per('FIBTG')!) : undefined,
      sugars: per('SUGAR') !== undefined ? Math.round(per('SUGAR')!) : undefined,
      satFat: per('FASAT') !== undefined ? Math.round(per('FASAT')! * 10) / 10 : undefined,
      salt: per('NA') !== undefined ? Math.round((per('NA')! * 2.5) / 100) / 10 : undefined,
    },
  }, contains);
}

function edParams(extra: Record<string, string>) {
  const appId = env('EDAMAM_APP_ID'), appKey = env('EDAMAM_APP_KEY');
  if (!appId || !appKey) return null;
  return new URLSearchParams({ type: 'public', app_id: appId, app_key: appKey, ...extra });
}

const edHeaders = (userId: string) => ({ 'Edamam-Account-User': userId.slice(0, 30) });

export async function edSearch(p: SearchParams, userId: string): Promise<Recipe[]> {
  const q = edParams({ q: p.query || 'dinner', mealType: 'Dinner' });
  if (!q) return [];
  if (p.cuisine && ED_CUISINE[p.cuisine]) q.set('cuisineType', ED_CUISINE[p.cuisine]);
  if (p.vegan) q.append('health', 'vegan'); else if (p.vegetarian) q.append('health', 'vegetarian');
  if (p.maxMinutes) q.set('time', `1-${p.maxMinutes}`);
  if (p.maxCalories) q.set('calories', `0-${p.maxCalories * 6}`); // Edamam filters whole-recipe calories
  if (p.random) q.set('random', 'true');
  const data = await getJson(`${ED}?${q}`, edHeaders(userId));
  return (data?.hits || []).map((h: any) => edRecipe(h.recipe)).filter(Boolean).slice(0, p.number ?? 12) as Recipe[];
}

export async function edById(id: string, userId: string): Promise<Recipe | null> {
  const q = edParams({});
  if (!q) return null;
  const data = await getJson(`${ED}/${encodeURIComponent(id)}?${q}`, edHeaders(userId));
  return data?.recipe ? edRecipe(data.recipe) : null;
}

// ---------------- Combined ----------------

export function dedupe(list: Recipe[]): Recipe[] {
  const seen = new Set<string>();
  const out: Recipe[] = [];
  for (const r of list) {
    const k = key(r.title);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

export async function fetchById(fullId: string, userId: string): Promise<Recipe | null> {
  const [src, id] = [fullId.slice(0, fullId.indexOf(':')), fullId.slice(fullId.indexOf(':') + 1)];
  if (src === 'sp') return spById(id);
  if (src === 'mdb') return mdbById(id);
  if (src === 'ed') return edById(id, userId);
  return null;
}
