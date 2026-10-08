import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichRecipe, suits, tasteScore, matchPantry, isFreeRecipe, key, DEFAULT_PREFS, DEFAULT_TASTES,
} from '../supabase/functions/_shared/domain.ts';
import type { Recipe, FoodPrefs } from '../supabase/functions/_shared/domain.ts';

function recipe(title: string, ingredients: string[], extra: Partial<Recipe> = {}): Recipe {
  return enrichRecipe({
    id: 'test:' + key(title), source: 'spoonacular', title, servings: 4, steps: ['Cook it.'],
    ingredients: ingredients.map((i) => ({ name: i, original: i })), ...extra,
  });
}

const tikka = recipe('Chicken tikka masala', ['chicken thighs', 'natural yoghurt', 'tikka curry paste', 'onion', 'garlic cloves', 'chopped tomatoes', 'basmati rice', 'vegetable oil'], { cuisine: 'Indian' });
const chilli = recipe('Black bean chilli', ['sweet potatoes', 'onion', 'black beans', 'chopped tomatoes', 'chilli powder', 'rice'], { cuisine: 'Mexican' });
const greenCurry = recipe('Thai green prawn curry', ['king prawns', 'Thai green curry paste', 'coconut milk', 'spinach', 'jasmine rice'], { cuisine: 'Thai' });
const satay = recipe('Tofu satay noodles', ['firm tofu', 'peanut butter', 'soy sauce', 'rice noodles', 'spring onions']);
const pie = recipe('Cottage pie', ['beef mince', 'carrots', 'beef stock cube', 'potatoes', 'cheddar', 'butter']);
const peaRisotto = recipe('Pea and mint risotto', ['frozen peas', 'arborio rice', 'vegetable stock', 'mint']);

const prefs = (p: Partial<FoodPrefs> = {}): FoodPrefs => ({ ...DEFAULT_PREFS, ...p, tastes: { ...DEFAULT_TASTES, ...(p.tastes || {}) } });

test('detects allergens from ingredients', () => {
  assert.deepEqual(tikka.allergens.sort(), ['milk', 'mustard']);
  assert.ok(greenCurry.allergens.includes('crustaceans'));
  assert.ok(greenCurry.allergens.includes('fish'), 'Thai curry paste usually contains fish sauce');
  assert.ok(!greenCurry.allergens.includes('milk'), 'coconut milk is not dairy');
  assert.ok(satay.allergens.includes('peanuts'));
  assert.ok(satay.allergens.includes('soya'));
  assert.ok(satay.allergens.includes('gluten'), 'soy sauce and noodles are treated as gluten');
  assert.ok(pie.allergens.includes('celery') && pie.allergens.includes('milk'));
  assert.ok(!peaRisotto.allergens.includes('peanuts'), '"peas" must not match "peanut"');
});

test('detects diet suitability', () => {
  assert.equal(chilli.vegan, true);
  assert.equal(satay.vegan, true, 'peanut butter is not butter');
  assert.equal(peaRisotto.vegan, true, 'vegetable stock is vegan');
  assert.equal(tikka.vegetarian, false);
  assert.deepEqual(tikka.meatGroups, ['chicken']);
  assert.deepEqual(greenCurry.meatGroups, ['seafood']);
  assert.equal(pie.vegetarian, false);
});

test('allergies always filter, whatever the diet', () => {
  const p = prefs({ allergies: ['milk'] });
  assert.equal(suits(tikka, p), false);
  assert.equal(suits(chilli, p), true);
  assert.equal(suits(satay, prefs({ allergies: ['peanuts'] })), false);
  assert.equal(suits(chilli, prefs({ allergyOther: ['sweet potato'] })), false);
});

test('diet filters', () => {
  assert.equal(suits(tikka, prefs({ diet: 'vegan' })), false);
  assert.equal(suits(chilli, prefs({ diet: 'vegan' })), true);
  assert.equal(suits(greenCurry, prefs({ diet: 'pesc' })), true);
  assert.equal(suits(tikka, prefs({ diet: 'pesc' })), false);
  assert.equal(suits(greenCurry, prefs({ diet: 'veg' })), false);
});

test('meats not eaten and avoided foods are filtered', () => {
  assert.equal(suits(pie, prefs({ tastes: { ...DEFAULT_TASTES, meats: ['chicken', 'fish', 'seafood'] } })), false);
  assert.equal(suits(tikka, prefs({ tastes: { ...DEFAULT_TASTES, meats: ['chicken'] } })), true);
  assert.equal(suits(greenCurry, prefs({ tastes: { ...DEFAULT_TASTES, avoid: ['coconut'] } })), false);
  assert.equal(suits(chilli, prefs({ tastes: { ...DEFAULT_TASTES, avoid: ['pulses'] } })), false);
});

test('mild spice hides very hot dishes', () => {
  const jerk = recipe('Jerk chicken', ['chicken thighs', 'scotch bonnet', 'lime']);
  assert.equal(jerk.spice, 3);
  assert.equal(suits(jerk, prefs({ tastes: { ...DEFAULT_TASTES, spice: 'mild' } })), false);
});

test('taste score explains itself', () => {
  const s = tasteScore(tikka, { ...DEFAULT_TASTES, cuisines: ['Indian'], spice: 'hot' });
  assert.equal(s.score, 3);
  assert.equal(s.reason, 'You like Indian food and a bit of heat');
});

test('pantry matching uses whole words and ignores staples', () => {
  const m = matchPantry(tikka, ['chicken', 'onion', 'garlic', 'rice', 'tomato']);
  assert.equal(m.total, 7);
  assert.equal(m.have, 5);
  assert.deepEqual(m.missing, ['natural yoghurt', 'tikka curry paste']);
});

test('free slice is stable and roughly a quarter', () => {
  const ids = Array.from({ length: 2000 }, (_, i) => 'sp:' + i);
  const free = ids.filter(isFreeRecipe).length;
  assert.ok(free > 400 && free < 600, `got ${free}`);
  assert.equal(isFreeRecipe('sp:42'), isFreeRecipe('sp:42'));
});
