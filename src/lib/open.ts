import { router } from 'expo-router';
import type { RecipeCard } from './api';

/** Opens a recipe, or the paywall (with a reason) when it needs Premium. */
export function openRecipe(r: RecipeCard) {
  if (r.locked) {
    router.push({ pathname: '/paywall', params: { reason: `Unlock ${r.title} and the full recipe library.` } });
    return;
  }
  router.push({ pathname: '/recipe/[id]', params: { id: r.id } });
}

export function openPaywall(reason: string) {
  router.push({ pathname: '/paywall', params: { reason } });
}
