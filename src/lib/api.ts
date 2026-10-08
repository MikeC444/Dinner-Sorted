// Client for the `recipes` edge function. All filtering for allergies and diet happens on the server too.

import type { PantryMatch, Recipe } from '../../supabase/functions/_shared/domain.ts';
import { supabase } from './supabase';

export type RecipeCard = Recipe & { match?: PantryMatch; reason?: string };

export class PremiumRequired extends Error {
  constructor(public reason: 'premium' | 'limit_reached', public recipe?: RecipeCard) { super(reason); }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('recipes', { body });
  if (error) {
    // FunctionsHttpError carries the response so we can read our own error codes.
    const ctx: any = (error as any).context;
    let payload: any = null;
    try { payload = ctx && typeof ctx.json === 'function' ? await ctx.json() : null; } catch { /* ignore */ }
    if (ctx?.status === 402 || payload?.error === 'premium' || payload?.error === 'limit_reached') {
      throw new PremiumRequired(payload?.error === 'limit_reached' ? 'limit_reached' : 'premium', payload?.recipe);
    }
    throw new Error(payload?.error || error.message || 'request_failed');
  }
  return data as T;
}

export interface SearchFilters {
  quick?: boolean; light?: boolean; vegetarian?: boolean; vegan?: boolean;
  highProtein?: boolean; lowCarb?: boolean; under10?: boolean;
}

export const api = {
  usage: () => call<{ premium: boolean; kitchenSearchesLeft: number | null }>({ action: 'usage' }),
  suggest: (pantry: string[]) => call<{ recipes: RecipeCard[] }>({ action: 'suggest', pantry }),
  search: (query: string, cuisine: string | null, filters: SearchFilters, page = 0) =>
    call<{ recipes: RecipeCard[]; hasMore: boolean }>({ action: 'search', query, cuisine, filters, page }),
  pantry: (pantry: string[]) => call<{ recipes: RecipeCard[]; kitchenSearchesLeft: number | null }>({ action: 'pantry', pantry }),
  detail: (id: string) => call<{ recipe: RecipeCard; warnings: string[] }>({ action: 'detail', id }),
  plan: (dinnerBudget: number, pantry: string[]) =>
    call<{ days: { day: string; recipe: RecipeCard }[] }>({ action: 'plan', dinnerBudget, pantry }),
};

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
}
