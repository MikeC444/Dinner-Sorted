import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcGoal, checkGoal, cmToFtIn, kgToStLb } from '../src/lib/nutrition.ts';
import type { Goal } from '../src/lib/nutrition.ts';
import { findItem, parseTyped, pantryTerms, suggest, itemAllowed, CATALOGUE } from '../src/lib/ingredients.ts';

const base: Goal = { sex: 'f', age: 34, heightCm: 168, weightKg: 82, targetKg: 72, activity: 'light', pace: 0.5 };

test('weight loss target and dinner budget', () => {
  const r = calcGoal(base, new Date('2026-10-04'));
  assert.equal(r.mode, 'lose');
  assert.equal(r.dailyKcal, 1570);
  assert.equal(r.dinnerKcal, 550);
  assert.equal(Math.round(r.bmi * 10) / 10, 29.1);
  assert.equal(r.weeks, 20);
  assert.equal(r.floorApplied, false);
});

test('never goes below the safe floor', () => {
  const r = calcGoal({ ...base, weightKg: 60, targetKg: 52, activity: 'low', pace: 0.75 });
  assert.equal(r.floorApplied, true);
  assert.ok(r.dailyKcal >= 1200);
});

test('warns when the target is below a healthy weight', () => {
  const r = calcGoal({ ...base, targetKg: 45 });
  assert.equal(r.lowestHealthyKg, 53);
});

test('maintain and gain modes', () => {
  assert.equal(calcGoal({ ...base, targetKg: 82 }).mode, 'maintain');
  const g = calcGoal({ ...base, weightKg: 60, targetKg: 65 });
  assert.equal(g.mode, 'gain');
  assert.ok(g.weeks! > 0);
});

test('weight tools are adults only', () => {
  assert.deepEqual(checkGoal({ ...base, age: 16 }), { ok: false, reason: 'minor' });
  assert.deepEqual(checkGoal({ ...base, heightCm: undefined }), { ok: false, reason: 'incomplete' });
  assert.deepEqual(checkGoal(base), { ok: true });
});

test('imperial helpers', () => {
  assert.equal(cmToFtIn(168), '5 ft 6 in');
  assert.equal(kgToStLb(82), '12 st 13 lb');
});

test('typed ingredients resolve to catalogue items or custom ones', () => {
  assert.equal(findItem('Chicken breasts')?.key, 'chicken');
  assert.equal(findItem('spaghetti')?.key, 'pasta');
  assert.equal(findItem('Quorn')?.key, 'plantmince');
  const items = parseTyped('feta, maple syrup, cherry tomatoes');
  assert.deepEqual(items.map((i) => i.key), ['feta', 'c:maple syrup', 'freshtom']);
  assert.ok(pantryTerms(items).includes('maple syrup'));
  assert.ok(pantryTerms([{ key: 'pasta', label: 'Pasta', custom: false }]).includes('spaghetti'));
});

test('suggestions respect diet', () => {
  const all = (i: any) => itemAllowed(i, 'vegan', ['chicken']);
  assert.ok(!suggest('chee', [], all).some((i) => i.key === 'cheddar'));
  assert.ok(suggest('chee', [], all).some((i) => i.key === 'vegancheese'));
  assert.equal(CATALOGUE.length, 99);
});
