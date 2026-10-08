// The tap-to-add ingredient catalogue for the Kitchen tab, plus typed-ingredient matching.

import { key } from '../../supabase/functions/_shared/domain.ts';
import type { Diet, MeatGroup } from '../../supabase/functions/_shared/domain.ts';

export type CategoryId = 'veg' | 'plant' | 'meat' | 'dairy' | 'cupboard' | 'fruit';

export interface CatalogueItem {
  key: string;
  label: string;
  category: CategoryId;
  aliases: string[];
  /** Not suitable for vegans (dairy, eggs, honey...). Meat & fish are handled by `meat`. */
  animal?: boolean;
  meat?: MeatGroup;
}

export interface PantryItem { key: string; label: string; custom: boolean }

type Row = [string, string, string[]?, { animal?: boolean; meat?: MeatGroup }?];

const CATS: { id: CategoryId; label: string; rows: Row[] }[] = [
  { id: 'veg', label: 'Veg', rows: [
    ['onion', 'Onions', ['brown onion', 'white onion']], ['redonion', 'Red onions'], ['garlic', 'Garlic', ['garlic clove']], ['ginger', 'Ginger'],
    ['peppers', 'Peppers', ['pepper', 'bell pepper', 'red pepper', 'green pepper']], ['spinach', 'Spinach'], ['carrots', 'Carrots'],
    ['potatoes', 'Potatoes', ['potato', 'spuds']], ['sweetpotato', 'Sweet potatoes'], ['broccoli', 'Broccoli'], ['cauliflower', 'Cauliflower'],
    ['courgette', 'Courgettes', ['zucchini']], ['mushrooms', 'Mushrooms'], ['freshtom', 'Fresh tomatoes', ['cherry tomato', 'tomato']],
    ['cucumber', 'Cucumber'], ['lettuce', 'Lettuce', ['salad leaves', 'salad']], ['cabbage', 'Cabbage'], ['leeks', 'Leeks'], ['celery', 'Celery'],
    ['squash', 'Butternut squash', ['squash']], ['aubergine', 'Aubergine', ['eggplant']], ['greenbeans', 'Green beans'],
    ['sweetcorn', 'Sweetcorn', ['corn']], ['peas', 'Frozen peas', ['peas', 'pea']], ['springonion', 'Spring onions', ['scallion', 'green onion']],
    ['chillies', 'Chillies', ['chilli', 'chili']], ['avocado', 'Avocado'], ['kale', 'Kale'],
  ] },
  { id: 'plant', label: 'Plant protein', rows: [
    ['tofu', 'Tofu', ['firm tofu', 'silken tofu']], ['tempeh', 'Tempeh'], ['lentils', 'Lentils', ['red lentil', 'green lentil']],
    ['chickpeas', 'Chickpeas', ['chick pea']], ['kidneybeans', 'Kidney beans', ['kidney bean']], ['blackbeans', 'Black beans', ['black bean']],
    ['butterbeans', 'Butter beans'], ['bakedbeans', 'Baked beans'], ['edamame', 'Edamame'],
    ['plantmince', 'Plant-based mince', ['quorn', 'vegan mince', 'soya mince']], ['peanutbutter', 'Peanut butter'],
    ['nuts', 'Nuts', ['cashew', 'almond', 'peanut', 'walnut']],
  ] },
  { id: 'meat', label: 'Meat & fish', rows: [
    ['chicken', 'Chicken', ['chicken breast', 'chicken thigh'], { meat: 'chicken' }],
    ['beefmince', 'Beef mince', ['mince', 'minced beef', 'ground beef'], { meat: 'beef' }], ['steak', 'Steak', ['beef'], { meat: 'beef' }],
    ['pork', 'Pork', ['pork chop'], { meat: 'pork' }], ['sausages', 'Sausages', ['sausage'], { meat: 'pork' }],
    ['bacon', 'Bacon', [], { meat: 'pork' }], ['ham', 'Ham', [], { meat: 'pork' }], ['chorizo', 'Chorizo', [], { meat: 'pork' }],
    ['lamb', 'Lamb', ['lamb mince'], { meat: 'lamb' }], ['turkey', 'Turkey mince', ['turkey'], { meat: 'turkey' }],
    ['salmon', 'Salmon', [], { meat: 'fish' }], ['whitefish', 'White fish', ['cod', 'haddock', 'pollock'], { meat: 'fish' }],
    ['tuna', 'Tinned tuna', ['tuna'], { meat: 'fish' }], ['prawns', 'Prawns', ['shrimp', 'prawn'], { meat: 'seafood' }],
  ] },
  { id: 'dairy', label: 'Dairy, eggs & alternatives', rows: [
    ['eggs', 'Eggs', ['egg'], { animal: true }], ['milk', 'Milk', [], { animal: true }],
    ['oatmilk', 'Oat milk', ['plant milk', 'soya milk', 'almond milk']], ['butter', 'Butter', [], { animal: true }],
    ['veganbutter', 'Vegan butter', ['plant butter']], ['cheddar', 'Cheddar', ['cheese'], { animal: true }],
    ['mozzarella', 'Mozzarella', [], { animal: true }], ['feta', 'Feta', [], { animal: true }], ['halloumi', 'Halloumi', [], { animal: true }],
    ['parmesan', 'Parmesan', [], { animal: true }], ['vegancheese', 'Vegan cheese', ['plant cheese']],
    ['yoghurt', 'Yoghurt', ['yogurt', 'greek yoghurt', 'natural yoghurt'], { animal: true }],
    ['plantyoghurt', 'Plant yoghurt', ['vegan yoghurt', 'coconut yoghurt', 'soya yoghurt']],
    ['cream', 'Cream', ['double cream', 'single cream'], { animal: true }],
    ['cremefraiche', 'Crème fraîche', ['creme fraiche'], { animal: true }], ['creamcheese', 'Cream cheese', [], { animal: true }],
  ] },
  { id: 'cupboard', label: 'Cupboard', rows: [
    ['rice', 'Rice', ['basmati', 'jasmine rice']], ['pasta', 'Pasta', ['spaghetti', 'penne', 'fusilli']], ['noodles', 'Noodles', ['egg noodle', 'rice noodle']],
    ['couscous', 'Couscous'], ['bread', 'Bread'], ['tortillas', 'Tortillas', ['wrap']], ['flour', 'Flour'], ['oats', 'Oats'], ['quinoa', 'Quinoa'],
    ['tinnedtomatoes', 'Tinned tomatoes', ['chopped tomato', 'canned tomato']], ['passata', 'Passata'], ['tompuree', 'Tomato purée', ['tomato puree', 'tomato paste']],
    ['coconutmilk', 'Coconut milk'], ['stock', 'Stock cubes', ['stock', 'stock cube']], ['currypaste', 'Curry paste'], ['soy', 'Soy sauce'],
    ['honey', 'Honey', [], { animal: true }], ['spices', 'Spice mix', ['spices', 'cumin', 'paprika', 'chilli powder', 'garam masala']],
    ['pesto', 'Pesto', [], { animal: true }], ['mayo', 'Mayonnaise', ['mayo'], { animal: true }], ['vinegar', 'Vinegar'], ['sugar', 'Sugar'],
  ] },
  { id: 'fruit', label: 'Fruit & herbs', rows: [
    ['lemon', 'Lemons', ['lemon']], ['lime', 'Limes', ['lime']], ['basil', 'Fresh basil', ['basil']], ['coriander', 'Coriander', ['cilantro']],
    ['parsley', 'Parsley'], ['apples', 'Apples', ['apple']], ['bananas', 'Bananas', ['banana']],
  ] },
];

export const CATEGORIES: { id: CategoryId; label: string }[] = CATS.map((c) => ({ id: c.id, label: c.label }));

export const CATALOGUE: CatalogueItem[] = CATS.flatMap((c) => c.rows.map(([k, label, aliases = [], extra = {}]) => ({
  key: k, label, category: c.id, aliases, ...extra,
})));

const TERMS: Record<string, string[]> = Object.fromEntries(
  CATALOGUE.map((i) => [i.key, Array.from(new Set([key(i.label), ...i.aliases.map(key)]))]),
);

export function itemAllowed(item: CatalogueItem, diet: Diet, meatsEaten: MeatGroup[]): boolean {
  if (item.meat) {
    if (diet === 'veg' || diet === 'vegan') return false;
    if (diet === 'pesc' && item.meat !== 'fish' && item.meat !== 'seafood') return false;
    return meatsEaten.includes(item.meat);
  }
  if (diet === 'vegan' && item.animal) return false;
  return true;
}

/** Exact match on label or alias (singular/plural and case insensitive). */
export function findItem(text: string): CatalogueItem | null {
  const k = key(text);
  if (!k) return null;
  return CATALOGUE.find((i) => TERMS[i.key].includes(k)) || null;
}

export function suggest(text: string, exclude: string[], allowed: (i: CatalogueItem) => boolean, limit = 6): CatalogueItem[] {
  const k = key(String(text).split(',').pop() || '');
  if (k.length < 2) return [];
  return CATALOGUE
    .filter((i) => !exclude.includes(i.key) && allowed(i) && TERMS[i.key].some((t) => t.includes(k)))
    .sort((a, b) => {
      const as = TERMS[a.key].some((t) => t.startsWith(k)) ? 0 : 1;
      const bs = TERMS[b.key].some((t) => t.startsWith(k)) ? 0 : 1;
      return as - bs || a.label.length - b.label.length;
    })
    .slice(0, limit);
}

/** Turns "chicken breast, feta, quorn, maple syrup" into pantry items. */
export function parseTyped(text: string): PantryItem[] {
  return String(text).split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).map((part) => {
    const hit = findItem(part);
    if (hit) return { key: hit.key, label: hit.label, custom: false };
    return { key: 'c:' + key(part), label: part.charAt(0).toUpperCase() + part.slice(1), custom: true };
  }).filter((p) => p.key.length > 2);
}

/** Words sent to the recipe service to describe what's in the kitchen. */
export function pantryTerms(items: PantryItem[]): string[] {
  const out = new Set<string>();
  for (const p of items) {
    if (p.custom) out.add(p.key.slice(2));
    else for (const t of TERMS[p.key] || [key(p.label)]) out.add(t);
  }
  return Array.from(out);
}
