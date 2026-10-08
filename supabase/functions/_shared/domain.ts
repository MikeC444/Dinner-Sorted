// Shared, dependency-free domain logic used by BOTH the app and the Supabase
// edge functions. Keep this file free of imports so it runs in React Native,
// Deno and Node (for tests) unchanged.

// ---------- Types ----------

export type Diet = 'all' | 'pesc' | 'veg' | 'vegan';
export type Spice = 'mild' | 'medium' | 'hot';
export type MeatGroup = 'chicken' | 'beef' | 'pork' | 'lamb' | 'turkey' | 'fish' | 'seafood';

export type AllergenKey =
  | 'gluten' | 'milk' | 'eggs' | 'peanuts' | 'nuts' | 'fish' | 'crustaceans'
  | 'molluscs' | 'soya' | 'sesame' | 'mustard' | 'celery' | 'sulphites' | 'lupin';

export interface Tastes {
  /** Meat and fish groups the person eats. All seven by default. */
  meats: MeatGroup[];
  /** Veg the person loves (keys from VEG_OPTIONS). */
  veg: string[];
  /** Favourite cuisines (labels from CUISINES). */
  cuisines: string[];
  spice: Spice;
  /** Things they'd rather avoid (keys from AVOID_OPTIONS). */
  avoid: string[];
}

export interface FoodPrefs {
  diet: Diet;
  allergies: AllergenKey[];
  /** Free-text allergies/intolerances, normalised with key(). */
  allergyOther: string[];
  tastes: Tastes;
}

export interface Ingredient {
  name: string;          // e.g. "chicken thighs"
  original: string;      // e.g. "600g chicken thighs, diced"
  amount?: number;
  unit?: string;
}

export interface Nutrition {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre?: number;
  sugars?: number;
  satFat?: number;
  salt?: number;
  micros?: { name: string; amount: number; unit: string }[];
}

export type RecipeSource = 'spoonacular' | 'themealdb' | 'edamam';

export interface Recipe {
  id: string;                  // "sp:123", "mdb:52772", "ed:abc"
  source: RecipeSource;
  sourceName?: string;
  sourceUrl?: string;
  title: string;
  image?: string;
  cuisine?: string;
  minutes?: number;
  servings: number;
  ingredients: Ingredient[];
  steps: string[];             // may be empty (Edamam links out to the method)
  nutrition?: Nutrition;       // per serving
  vegetarian: boolean;
  vegan: boolean;
  allergens: AllergenKey[];
  meatGroups: MeatGroup[];
  spice: 1 | 2 | 3;
  /** Set per response: true when the viewer needs Premium to open it. */
  locked?: boolean;
}

// ---------- Option lists ----------

export const ALL_MEATS: MeatGroup[] = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'fish', 'seafood'];

export const ALLERGENS: { key: AllergenKey; label: string }[] = [
  { key: 'gluten', label: 'Gluten' },
  { key: 'milk', label: 'Milk' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'peanuts', label: 'Peanuts' },
  { key: 'nuts', label: 'Tree nuts' },
  { key: 'fish', label: 'Fish' },
  { key: 'crustaceans', label: 'Crustaceans' },
  { key: 'molluscs', label: 'Molluscs' },
  { key: 'soya', label: 'Soya' },
  { key: 'sesame', label: 'Sesame' },
  { key: 'mustard', label: 'Mustard' },
  { key: 'celery', label: 'Celery' },
  { key: 'sulphites', label: 'Sulphites' },
  { key: 'lupin', label: 'Lupin' },
];

export const CUISINES = [
  'British', 'Italian', 'Indian', 'Chinese', 'Mexican', 'Thai', 'Japanese',
  'Middle Eastern', 'Mediterranean', 'French', 'Spanish', 'Greek',
  'Caribbean', 'West African', 'Korean', 'Vietnamese', 'American',
];

export const VEG_OPTIONS: { key: string; label: string; words: string[] }[] = [
  { key: 'peppers', label: 'Peppers', words: ['pepper', 'capsicum'] },
  { key: 'spinach', label: 'Spinach', words: ['spinach'] },
  { key: 'broccoli', label: 'Broccoli', words: ['broccoli', 'tenderstem'] },
  { key: 'mushrooms', label: 'Mushrooms', words: ['mushroom'] },
  { key: 'sweetpotato', label: 'Sweet potato', words: ['sweet potato'] },
  { key: 'carrots', label: 'Carrots', words: ['carrot'] },
  { key: 'tomatoes', label: 'Tomatoes', words: ['tomato', 'passata'] },
  { key: 'peas', label: 'Peas', words: ['pea'] },
  { key: 'courgette', label: 'Courgette', words: ['courgette', 'zucchini'] },
  { key: 'aubergine', label: 'Aubergine', words: ['aubergine', 'eggplant'] },
  { key: 'cauliflower', label: 'Cauliflower', words: ['cauliflower'] },
  { key: 'potatoes', label: 'Potatoes', words: ['potato'] },
  { key: 'greenbeans', label: 'Green beans', words: ['green bean', 'fine bean'] },
  { key: 'kale', label: 'Kale', words: ['kale', 'cavolo nero'] },
  { key: 'sweetcorn', label: 'Sweetcorn', words: ['sweetcorn', 'corn'] },
  { key: 'squash', label: 'Squash', words: ['squash', 'pumpkin'] },
];

export const AVOID_OPTIONS: { key: string; label: string; words: string[]; animal?: boolean }[] = [
  { key: 'mushrooms', label: 'Mushrooms', words: ['mushroom'] },
  { key: 'coconut', label: 'Coconut', words: ['coconut'] },
  { key: 'eggs', label: 'Eggs', words: ['egg'], animal: true },
  { key: 'cheese', label: 'Cheese', words: ['cheese', 'cheddar', 'parmesan', 'mozzarella', 'feta', 'halloumi', 'ricotta', 'paneer'], animal: true },
  { key: 'tofu', label: 'Tofu', words: ['tofu', 'tempeh'] },
  { key: 'pulses', label: 'Beans and lentils', words: ['bean', 'lentil', 'chickpea'] },
  { key: 'nuts', label: 'Peanuts and nuts', words: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio'] },
  { key: 'onion', label: 'Onions', words: ['onion', 'shallot'] },
  { key: 'coriander', label: 'Coriander', words: ['coriander', 'cilantro'] },
  { key: 'olives', label: 'Olives', words: ['olive '] },
];

export const DEFAULT_TASTES: Tastes = {
  meats: [...ALL_MEATS], veg: [], cuisines: [], spice: 'medium', avoid: [],
};

export const DEFAULT_PREFS: FoodPrefs = {
  diet: 'all', allergies: [], allergyOther: [], tastes: DEFAULT_TASTES,
};

// ---------- Text helpers ----------

export function norm(t: string): string {
  return String(t || '').toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-zà-ÿ\s-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** Very small singulariser so "tomatoes" matches "tomato". */
export function sing(t: string): string {
  return t.split(' ').map((w) => {
    if (w.length > 5 && /llies$/.test(w)) return w.slice(0, -2); // chillies -> chilli
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /(oes|ches|shes)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }).join(' ');
}

export function key(t: string): string {
  return sing(norm(t));
}

/** Pads with spaces so we can match whole words: " pea " won't match "peanut". */
export function padded(t: string): string {
  return ' ' + key(t) + ' ';
}

/** Whole-word (or whole-phrase) match. haystack must come from padded(). */
export function containsWord(haystack: string, word: string): boolean {
  const w = key(word);
  if (!w) return false;
  return haystack.indexOf(' ' + w + ' ') >= 0;
}

// ---------- Detection: allergens, meat, animal products, spice ----------

// Phrases removed before matching so they don't trigger false positives.
const NEUTRAL_PHRASES = [
  'coconut milk', 'coconut cream', 'oat milk', 'almond milk', 'soy milk', 'soya milk', 'rice milk', 'plant milk',
  'peanut butter', 'almond butter', 'nut butter', 'cocoa butter', 'butter bean', 'butternut',
  'eggplant', 'vegan', 'plant based', 'plant-based', 'dairy free', 'dairy-free', 'cream of tartar',
  'gluten free', 'gluten-free', 'egg free', 'egg-free', 'nutmeg', 'coconut', 'water chestnut', 'tiger nut',
];

function stripNeutral(text: string, keep: string[] = []): string {
  let t = padded(text);
  for (const p of NEUTRAL_PHRASES) {
    if (keep.includes(p)) continue;
    t = t.split(' ' + key(p) + ' ').join(' ');
  }
  return t;
}

const ALLERGEN_WORDS: Record<AllergenKey, string[]> = {
  gluten: ['wheat', 'flour', 'bread', 'breadcrumb', 'panko', 'pasta', 'spaghetti', 'penne', 'fusilli', 'linguine', 'tagliatelle',
    'lasagne', 'macaroni', 'noodle', 'couscous', 'bulgur', 'barley', 'rye', 'spelt', 'semolina', 'tortilla', 'wrap', 'pitta',
    'naan', 'pastry', 'oat', 'seitan', 'soy sauce', 'beer', 'stock cube', 'bouillon', 'gravy', 'udon', 'gnocchi', 'crouton', 'biscuit'],
  milk: ['milk', 'butter', 'cheese', 'cream', 'yoghurt', 'yogurt', 'ghee', 'creme fraiche', 'crème fraîche', 'parmesan', 'mozzarella',
    'cheddar', 'feta', 'halloumi', 'ricotta', 'mascarpone', 'paneer', 'whey', 'custard', 'buttermilk', 'gruyere', 'brie', 'quark', 'labneh'],
  eggs: ['egg', 'mayonnaise', 'mayo', 'meringue', 'aioli', 'brioche', 'hollandaise'],
  peanuts: ['peanut', 'groundnut', 'satay'],
  nuts: ['almond', 'cashew', 'walnut', 'pecan', 'hazelnut', 'pistachio', 'macadamia', 'brazil nut', 'pine nut', 'praline',
    'marzipan', 'pesto', 'frangipane', 'nut'],
  fish: ['fish', 'salmon', 'cod', 'haddock', 'tuna', 'mackerel', 'sardine', 'anchovy', 'trout', 'sea bass', 'pollock', 'hake',
    'tilapia', 'plaice', 'sole', 'kipper', 'worcestershire', 'caesar dressing', 'thai green curry paste', 'thai red curry paste'],
  crustaceans: ['prawn', 'shrimp', 'crab', 'lobster', 'langoustine', 'crayfish', 'shrimp paste',
    'thai green curry paste', 'thai red curry paste'],
  molluscs: ['mussel', 'clam', 'oyster', 'scallop', 'squid', 'calamari', 'octopus', 'cockle', 'whelk', 'snail'],
  soya: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'tamari', 'soybean', 'teriyaki'],
  sesame: ['sesame', 'tahini', 'hummus', 'houmous', 'zaatar', 'za atar'],
  mustard: ['mustard', 'curry paste', 'curry powder'],
  celery: ['celery', 'celeriac', 'stock cube', 'bouillon', 'gravy'],
  sulphites: ['wine', 'vinegar', 'balsamic', 'sherry', 'port', 'cider', 'dried apricot', 'sulphite', 'sulfite'],
  lupin: ['lupin', 'lupine'],
};

const MEAT_WORDS: Record<MeatGroup, string[]> = {
  chicken: ['chicken'],
  beef: ['beef', 'steak', 'brisket', 'veal', 'oxtail'],
  pork: ['pork', 'bacon', 'ham', 'sausage', 'chorizo', 'pancetta', 'prosciutto', 'salami', 'lardon', 'gammon', 'nduja', 'pepperoni'],
  lamb: ['lamb', 'mutton'],
  turkey: ['turkey'],
  fish: ['fish', 'salmon', 'cod', 'haddock', 'tuna', 'mackerel', 'sardine', 'anchovy', 'trout', 'sea bass', 'pollock', 'hake', 'tilapia', 'plaice', 'kipper'],
  seafood: ['prawn', 'shrimp', 'crab', 'lobster', 'mussel', 'clam', 'scallop', 'squid', 'calamari', 'oyster', 'octopus', 'langoustine'],
};

const OTHER_ANIMAL_WORDS = ['egg', 'milk', 'butter', 'cheese', 'cream', 'yoghurt', 'yogurt', 'honey', 'ghee', 'gelatin', 'gelatine',
  'parmesan', 'mozzarella', 'cheddar', 'feta', 'halloumi', 'ricotta', 'mascarpone', 'paneer', 'mayonnaise', 'mayo', 'whey',
  'lard', 'suet', 'anchovy', 'fish sauce', 'worcestershire', 'oyster sauce', 'stock'];

const HOT_WORDS = ['scotch bonnet', 'habanero', 'vindaloo', 'jerk', 'phaal', 'thai green curry', 'thai red curry', 'ghost pepper', 'bird eye chilli'];
const WARM_WORDS = ['chilli', 'chili', 'cayenne', 'jalapeno', 'jalapeño', 'harissa', 'sriracha', 'gochujang', 'chipotle', 'curry', 'tikka',
  'peri peri', 'piri piri', 'hot sauce', 'paprika', 'fajita'];

function ingredientText(r: { title?: string; ingredients: { name: string; original?: string }[] }): string {
  return r.ingredients.map((i) => i.original || i.name).join(' | ');
}

// Neutral phrases that still carry an allergen (checked against the unstripped text).
const PHRASE_ALLERGENS: Partial<Record<AllergenKey, string[]>> = {
  peanuts: ['peanut butter'],
  nuts: ['almond milk', 'almond butter', 'nut butter'],
  soya: ['soy milk', 'soya milk'],
  gluten: ['oat milk'],
};

export function detectAllergens(text: string): AllergenKey[] {
  const stripped = stripNeutral(text);
  const raw = padded(text);
  const out: AllergenKey[] = [];
  for (const a of ALLERGENS) {
    const hit = ALLERGEN_WORDS[a.key].some((w) => containsWord(stripped, w))
      || (PHRASE_ALLERGENS[a.key] || []).some((p) => containsWord(raw, p));
    if (hit) out.push(a.key);
  }
  // "rice noodles", "corn tortilla", "gluten-free pasta" etc are still flagged: conservative by design.
  return out;
}

export function detectMeatGroups(text: string): MeatGroup[] {
  const t = stripNeutral(text);
  const plant = /\b(vegan|plant|quorn|soya mince|meat free|meat-free|jackfruit)\b/;
  return ALL_MEATS.filter((g) => MEAT_WORDS[g].some((w) => {
    if (!containsWord(t, w)) return false;
    // "vegan sausages" / "quorn chicken pieces" style phrasing
    const idx = t.indexOf(' ' + key(w) + ' ');
    const before = t.slice(Math.max(0, idx - 14), idx);
    return !plant.test(before);
  }));
}

export function detectAnimalProducts(text: string): boolean {
  const t = stripNeutral(text);
  return OTHER_ANIMAL_WORDS.some((w) => {
    if (!containsWord(t, w)) return false;
    if (w === 'stock') return /(chicken|beef|fish|lamb|pork|ham) stock/.test(t);
    return true;
  });
}

export function detectSpice(text: string): 1 | 2 | 3 {
  const t = padded(text);
  if (HOT_WORDS.some((w) => containsWord(t, w))) return 3;
  if (WARM_WORDS.some((w) => containsWord(t, w))) return 2;
  return 1;
}

/** Fills the derived fields on a recipe from its title + ingredients. Provider flags can only ADD restrictions. */
export function enrichRecipe(
  base: Omit<Recipe, 'vegetarian' | 'vegan' | 'allergens' | 'meatGroups' | 'spice'>,
  providerContains: AllergenKey[] = [],
): Recipe {
  const text = ingredientText(base);
  const meatGroups = detectMeatGroups(text);
  const animal = detectAnimalProducts(text);
  const allergens = Array.from(new Set([...detectAllergens(text), ...providerContains]));
  const vegetarian = meatGroups.length === 0 && !/gelatin|anchov|fish sauce|lard|suet/.test(norm(text));
  const vegan = vegetarian && !animal;
  const spice = detectSpice(base.title + ' | ' + text);
  return { ...base, vegetarian, vegan, allergens, meatGroups, spice };
}

// ---------- Filtering & ranking ----------

/** True when the recipe is safe for the person's allergies and fits their diet and tastes. */
export function suits(r: Recipe, p: FoodPrefs): boolean {
  if (r.allergens.some((a) => p.allergies.includes(a))) return false;
  if (p.allergyOther.length) {
    const t = padded(ingredientText(r) + ' ' + r.title);
    if (p.allergyOther.some((o) => o.length >= 2 && containsWord(t, o))) return false;
  }
  if (p.diet === 'vegan' && !r.vegan) return false;
  if (p.diet === 'veg' && !r.vegetarian) return false;
  if (p.diet === 'pesc' && r.meatGroups.some((g) => g !== 'fish' && g !== 'seafood')) return false;
  if (!r.meatGroups.every((g) => p.tastes.meats.includes(g))) return false;
  if (p.tastes.avoid.length) {
    const t = padded(ingredientText(r));
    const words = AVOID_OPTIONS.filter((a) => p.tastes.avoid.includes(a.key)).flatMap((a) => a.words);
    if (words.some((w) => containsWord(stripNeutral(t, ['coconut', 'coconut milk', 'coconut cream']), w))) return false;
  }
  if (p.tastes.spice === 'mild' && r.spice >= 3) return false;
  return true;
}

export interface TasteResult { score: number; reason: string }

export function tasteScore(r: Recipe, t: Tastes): TasteResult {
  let score = 0;
  const likes: string[] = [];
  if (r.cuisine && t.cuisines.some((c) => norm(c) === norm(r.cuisine || ''))) {
    score += 2; likes.push(r.cuisine + ' food');
  }
  const text = padded(ingredientText(r));
  for (const v of VEG_OPTIONS) {
    if (t.veg.includes(v.key) && v.words.some((w) => containsWord(text, w))) { score += 1; likes.push(v.label.toLowerCase()); }
  }
  if (t.spice === 'hot' && r.spice >= 2) { score += 1; likes.push('a bit of heat'); }
  if (t.spice === 'mild' && r.spice >= 2) score -= 1;
  const shown = likes.slice(0, 2);
  const reason = shown.length === 2 ? `You like ${shown[0]} and ${shown[1]}` : shown.length === 1 ? `You like ${shown[0]}` : '';
  return { score, reason };
}

// ---------- Kitchen matching ----------

export interface PantryMatch { have: number; total: number; missing: string[]; pct: number }

const ASSUMED_STAPLES = ['oil', 'olive oil', 'vegetable oil', 'salt', 'pepper', 'black pepper', 'water', 'sea salt'];

/** pantryTerms: normalised words for each thing the person has, e.g. ["chicken", "onion", "spaghetti", "pasta"]. */
export function matchPantry(r: Recipe, pantryTerms: string[]): PantryMatch {
  const items = r.ingredients.filter((i) => !ASSUMED_STAPLES.includes(key(i.name)));
  const missing: string[] = [];
  let have = 0;
  for (const i of items) {
    const t = padded(i.name + ' ' + (i.original || ''));
    if (pantryTerms.some((p) => p.length >= 3 && containsWord(t, p))) have += 1;
    else missing.push(i.name);
  }
  const total = items.length || 1;
  return { have, total: items.length, missing, pct: Math.round((100 * have) / total) };
}

// ---------- Free tier ----------

/** A stable ~1 in 4 slice of the library is free; the rest needs Premium. */
export function isFreeRecipe(id: string): boolean {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 4) === 0;
}

export const FREE_KITCHEN_SEARCHES_PER_DAY = 3;
export const FREE_FAVOURITES = 10;
