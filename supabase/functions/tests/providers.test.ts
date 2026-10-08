// Run with: deno test supabase/functions/tests
// Checks that each provider's response shape becomes a correct Recipe, using trimmed sample payloads.

import { deepStrictEqual as assertEquals, ok as assert } from 'node:assert/strict';
import { edRecipe, mdbRecipe, spRecipe } from '../_shared/providers.ts';

Deno.test('Spoonacular recipe is normalised with nutrition and allergens', () => {
  const r = spRecipe({
    id: 715538, title: 'Chicken tikka masala', image: 'https://img.spoonacular.com/recipes/715538-556x370.jpg',
    readyInMinutes: 40, servings: 4, cuisines: ['Indian', 'Asian'], glutenFree: true, dairyFree: false,
    sourceName: 'Example Kitchen', sourceUrl: 'https://example.com/tikka',
    extendedIngredients: [
      { name: 'chicken thighs', nameClean: 'chicken thigh', original: '600g chicken thighs', amount: 600, unit: 'g' },
      { name: 'greek yogurt', original: '150g Greek yogurt', amount: 150, unit: 'g' },
      { name: 'garam masala', original: '2 tsp garam masala', amount: 2, unit: 'tsp' },
    ],
    analyzedInstructions: [{ steps: [{ step: 'Marinate the chicken.' }, { step: 'Cook the sauce for 15 minutes.' }] }],
    nutrition: { nutrients: [
      { name: 'Calories', amount: 512.3, unit: 'kcal' }, { name: 'Protein', amount: 38.2, unit: 'g' },
      { name: 'Carbohydrates', amount: 41.9, unit: 'g' }, { name: 'Fat', amount: 20.4, unit: 'g' },
      { name: 'Fiber', amount: 4.1, unit: 'g' }, { name: 'Sodium', amount: 720, unit: 'mg' }, { name: 'Iron', amount: 3.21, unit: 'mg' },
    ] },
  })!;
  assertEquals(r.id, 'sp:715538');
  assertEquals(r.cuisine, 'Indian');
  assertEquals(r.steps.length, 2);
  assertEquals(r.nutrition?.kcal, 512);
  assertEquals(r.nutrition?.salt, 1.8);
  assert(r.allergens.includes('milk'));
  assertEquals(r.meatGroups, ['chicken']);
  assertEquals(r.vegetarian, false);
});

Deno.test('TheMealDB meal is normalised and desserts are skipped', () => {
  const meal: Record<string, string | null> = {
    idMeal: '52772', strMeal: 'Teriyaki Chicken Casserole', strCategory: 'Chicken', strArea: 'Japanese',
    strInstructions: 'STEP 1\r\nPreheat oven to 180C.\r\nSTEP 2\r\nCombine soy sauce and honey.',
    strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg', strSource: null,
    strIngredient1: 'soy sauce', strMeasure1: '3/4 cup', strIngredient2: 'Chicken Breasts', strMeasure2: '2', strIngredient3: '', strMeasure3: '',
  };
  const r = mdbRecipe(meal)!;
  assertEquals(r.id, 'mdb:52772');
  assertEquals(r.steps, ['Preheat oven to 180C.', 'Combine soy sauce and honey.']);
  assertEquals(r.ingredients.length, 2);
  assert(r.allergens.includes('soya'));
  assertEquals(mdbRecipe({ ...meal, strCategory: 'Dessert' }), null);
});

Deno.test('Edamam recipe treats uncertified allergens as present', () => {
  const r = edRecipe({
    uri: 'http://www.edamam.com/ontologies/edamam.owl#recipe_abc123', label: 'Chickpea curry', image: 'https://example.com/c.jpg',
    source: 'Example', url: 'https://example.com/curry', yield: 4, totalTime: 30, cuisineType: ['indian'], calories: 1600,
    ingredients: [{ food: 'chickpeas', text: '2 tins chickpeas', quantity: 2, measure: 'tin' }, { food: 'coconut milk', text: '400ml coconut milk' }],
    healthLabels: ['Vegan', 'Vegetarian', 'Dairy-Free', 'Egg-Free', 'Peanut-Free', 'Tree-Nut-Free', 'Fish-Free', 'Crustacean-Free',
      'Mollusk-Free', 'Soy-Free', 'Sesame-Free', 'Celery-Free', 'Lupine-Free', 'Sulfite-Free', 'Gluten-Free'],
    totalNutrients: { PROCNT: { quantity: 60 }, CHOCDF: { quantity: 200 }, FAT: { quantity: 56 } },
  })!;
  assertEquals(r.id, 'ed:abc123');
  assertEquals(r.nutrition?.kcal, 400);
  assertEquals(r.nutrition?.protein, 15);
  assertEquals(r.steps, []);
  assertEquals(r.vegan, true);
  assertEquals(r.allergens, ['mustard'], 'no Mustard-Free label, so mustard is treated as present');
});
