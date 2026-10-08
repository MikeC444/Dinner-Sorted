// Demo mode: when no Supabase keys are set, the app runs on this small built-in recipe set
// (text only, no photos) so the screens can be explored without a backend.

import { matchPantry, type Ingredient, type Recipe } from '../../supabase/functions/_shared/domain.ts';
import type { RecipeCard } from './api';

type R = { id: string; title: string; cuisine: string; minutes: number; kcal: number; protein: number; veg?: 'vegan' | 'veg'; meats?: Recipe['meatGroups'];
  allergens?: Recipe['allergens']; ing: string[]; steps: string[] };

const ing = (s: string): Ingredient => ({ name: s.replace(/^[\d.]+\s*(g|ml|tbsp|tsp)?\s*/i, '').replace(/,.*$/, ''), original: s });

const RAW: R[] = [
  { id: 'demo:1', title: 'Mediterranean chicken bowl', cuisine: 'Mediterranean', minutes: 25, kcal: 480, protein: 38, meats: ['chicken'], allergens: ['milk'],
    ing: ['2 chicken breasts, sliced', '200g rice', '150g spinach', '200g cherry tomatoes, halved', '80g feta', '1 lemon', '2 tbsp olive oil'],
    steps: ['Cook the rice to the packet instructions.', 'Season the chicken and fry in olive oil for 6-8 minutes until golden and cooked through.', 'Wilt the spinach and warm the tomatoes in the same pan.', 'Pile everything into bowls, crumble over the feta and squeeze over the lemon.'] },
  { id: 'demo:2', title: 'Creamy mushroom tagliatelle', cuisine: 'Italian', minutes: 25, kcal: 520, protein: 17, veg: 'veg', allergens: ['gluten', 'milk'],
    ing: ['250g tagliatelle', '300g mushrooms, sliced', '2 cloves garlic', '150ml double cream', '30g parmesan', '1 tbsp olive oil'],
    steps: ['Boil the pasta in salted water.', 'Fry the mushrooms and garlic until golden.', 'Stir in the cream and parmesan, then toss through the drained pasta.'] },
  { id: 'demo:3', title: 'Chickpea and spinach curry', cuisine: 'Indian', minutes: 30, kcal: 410, protein: 15, veg: 'vegan',
    ing: ['1 onion, chopped', '2 cloves garlic', '1 tbsp curry powder', '400g tin chickpeas', '400g tin chopped tomatoes', '150g spinach', '1 tbsp vegetable oil'],
    steps: ['Soften the onion and garlic in oil.', 'Stir in the curry powder, then add the chickpeas and tomatoes.', 'Simmer for 15 minutes, then stir through the spinach.'] },
  { id: 'demo:4', title: 'Green Thai prawn curry', cuisine: 'Thai', minutes: 30, kcal: 445, protein: 28, meats: ['seafood'], allergens: ['crustaceans'],
    ing: ['300g prawns', '2 tbsp green curry paste', '400ml coconut milk', '1 courgette, sliced', '200g rice', '1 lime'],
    steps: ['Cook the rice.', 'Fry the curry paste for a minute, then add the coconut milk and courgette.', 'Simmer for 8 minutes, add the prawns for the last 3, and finish with lime.'] },
  { id: 'demo:5', title: 'Black bean tacos', cuisine: 'Mexican', minutes: 20, kcal: 430, protein: 16, veg: 'vegan', allergens: ['gluten'],
    ing: ['400g tin black beans', '8 small tortillas', '1 avocado', '2 tomatoes, diced', '1 tsp ground cumin', '1 lime'],
    steps: ['Warm the beans with the cumin.', 'Mash the avocado with lime juice.', 'Fill the tortillas with beans, avocado and tomato.'] },
  { id: 'demo:6', title: 'Salmon with roast potatoes and greens', cuisine: 'British', minutes: 35, kcal: 560, protein: 34, meats: ['fish'], allergens: ['fish'],
    ing: ['2 salmon fillets', '500g potatoes, cubed', '200g green beans', '1 lemon', '2 tbsp olive oil'],
    steps: ['Roast the potatoes in oil for 25 minutes.', 'Add the salmon for the last 12 minutes.', 'Steam the beans and serve with lemon.'] },
  { id: 'demo:7', title: 'Egg fried rice', cuisine: 'Chinese', minutes: 15, kcal: 470, protein: 16, veg: 'veg', allergens: ['eggs', 'soya'],
    ing: ['250g cooked rice', '3 eggs', '100g peas', '3 spring onions', '2 tbsp soy sauce', '1 tbsp vegetable oil'],
    steps: ['Scramble the eggs in a hot wok and set aside.', 'Fry the rice and peas for 3 minutes.', 'Return the egg, add soy sauce and spring onions.'] },
  { id: 'demo:8', title: 'Sausage and bean casserole', cuisine: 'British', minutes: 40, kcal: 590, protein: 27, meats: ['pork'],
    ing: ['6 sausages', '1 onion, sliced', '400g tin butter beans', '400g tin chopped tomatoes', '2 carrots, sliced', '1 tbsp olive oil'],
    steps: ['Brown the sausages and onion.', 'Add the carrots, beans and tomatoes.', 'Simmer for 25 minutes until thick.'] },
];

export const DEMO_RECIPES: Recipe[] = RAW.map((r) => ({
  id: r.id, source: 'themealdb' as Recipe['source'], sourceName: 'Demo', title: r.title, cuisine: r.cuisine, minutes: r.minutes, servings: 2,
  ingredients: r.ing.map(ing), steps: r.steps,
  nutrition: { kcal: r.kcal, protein: r.protein, carbs: 50, fat: 15 },
  vegetarian: !!r.veg, vegan: r.veg === 'vegan', allergens: r.allergens ?? [], meatGroups: r.meats ?? [], spice: 1,
}));

function card(r: Recipe, terms: string[], withMatch: boolean): RecipeCard {
  const out: RecipeCard = { ...r };
  if (withMatch) {
    out.match = matchPantry(r, terms);
    if (out.match.pct >= 50) out.reason = out.match.missing.length ? `You have ${out.match.have} of ${out.match.total} ingredients` : 'You have everything';
  }
  return out;
}

export const demoApi = {
  usage: async () => ({ premium: false, kitchenSearchesLeft: null as number | null }),
  suggest: async (pantry: string[]) => ({ recipes: DEMO_RECIPES.map((r) => card(r, pantry, true)).sort((a, b) => (b.match?.pct ?? 0) - (a.match?.pct ?? 0)) }),
  pantry: async (pantry: string[]) => ({ recipes: DEMO_RECIPES.map((r) => card(r, pantry, true)).sort((a, b) => (b.match?.pct ?? 0) - (a.match?.pct ?? 0)), kitchenSearchesLeft: null as number | null }),
  search: async (query: string, cuisine: string | null, filters: { vegan?: boolean; vegetarian?: boolean; quick?: boolean }) => {
    const q = query.trim().toLowerCase();
    const recipes = DEMO_RECIPES.filter((r) => (!cuisine || r.cuisine === cuisine) && (!filters.vegan || r.vegan) && (!filters.vegetarian || r.vegetarian)
      && (!filters.quick || (r.minutes ?? 99) <= 30) && (!q || r.title.toLowerCase().includes(q) || r.ingredients.some((i) => i.name.toLowerCase().includes(q)))).map((r) => card(r, [], false));
    return { recipes, hasMore: false };
  },
  detail: async (id: string) => {
    const r = DEMO_RECIPES.find((x) => x.id === id);
    if (!r) throw new Error('not_found');
    return { recipe: card(r, [], false), warnings: [] as string[] };
  },
  plan: async (budget: number, pantry: string[]) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const pool = DEMO_RECIPES.filter((r) => (r.nutrition?.kcal ?? 0) <= budget + 100);
    const use = pool.length ? pool : DEMO_RECIPES;
    return { days: days.map((day, i) => ({ day, recipe: card(use[i % use.length], pantry, true) })) };
  },
};
