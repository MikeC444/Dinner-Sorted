import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { DEFAULT_TASTES } from '../../supabase/functions/_shared/domain.ts';
import type { AllergenKey, Diet, Tastes } from '../../supabase/functions/_shared/domain.ts';
import { envReady } from '../lib/env';
import type { PantryItem } from '../lib/ingredients';
import type { Goal } from '../lib/nutrition';
import { supabase } from '../lib/supabase';

export interface Profile {
  displayName: string | null;
  diet: Diet;
  allergies: AllergenKey[];
  allergyOther: string[];
  tastes: Tastes;
  goal: Goal | null;
  healthConsentAt: string | null;
  onboarded: boolean;
}

export interface Favourite { recipeId: string; title: string; image?: string | null }

export const EMPTY_PROFILE: Profile = {
  displayName: null, diet: 'all', allergies: [], allergyOther: [],
  tastes: DEFAULT_TASTES, goal: null, healthConsentAt: null, onboarded: false,
};

interface AppState {
  ready: boolean;
  session: Session | null;
  profile: Profile;
  premium: boolean;
  pantry: PantryItem[];
  favourites: Favourite[];
  kitchenSearchesLeft: number | null;
  toast: string;

  setSession(s: Session | null): void;
  setReady(v: boolean): void;
  setPremium(v: boolean): void;
  setKitchenSearchesLeft(n: number | null): void;
  loadUserData(): Promise<void>;
  reset(): void;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  addPantry(items: PantryItem[]): Promise<void>;
  removePantry(key: string): Promise<void>;
  clearPantry(): Promise<void>;
  toggleFavourite(f: Favourite): Promise<'added' | 'removed' | 'limit'>;
  showToast(msg: string): void;
}

function toRow(p: Partial<Profile>) {
  const row: Record<string, unknown> = {};
  if (p.displayName !== undefined) row.display_name = p.displayName;
  if (p.diet !== undefined) row.diet = p.diet;
  if (p.allergies !== undefined) row.allergies = p.allergies;
  if (p.allergyOther !== undefined) row.allergy_other = p.allergyOther;
  if (p.tastes !== undefined) row.tastes = p.tastes;
  if (p.goal !== undefined) row.goal = p.goal;
  if (p.healthConsentAt !== undefined) row.health_consent_at = p.healthConsentAt;
  if (p.onboarded !== undefined) row.onboarded = p.onboarded;
  return row;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  session: null,
  profile: EMPTY_PROFILE,
  premium: false,
  pantry: [],
  favourites: [],
  kitchenSearchesLeft: null,
  toast: '',

  setSession: (session) => set({ session }),
  setReady: (ready) => set({ ready }),
  setPremium: (premium) => set({ premium }),
  setKitchenSearchesLeft: (n) => set({ kitchenSearchesLeft: n }),

  reset: () => set({ profile: EMPTY_PROFILE, premium: false, pantry: [], favourites: [], kitchenSearchesLeft: null }),

  async loadUserData() {
    const uid = envReady ? get().session?.user.id : undefined;
    if (!uid) return;
    const [profileRes, pantryRes, favRes, entRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('pantry_items').select('item_key,label,custom').order('created_at'),
      supabase.from('favourites').select('recipe_id,title,image').order('created_at', { ascending: false }),
      supabase.from('entitlements').select('is_premium,expires_at').eq('user_id', uid).maybeSingle(),
    ]);
    const p = profileRes.data;
    const tastes = { ...DEFAULT_TASTES, ...((p?.tastes || {}) as Partial<Tastes>) };
    set({
      profile: p ? {
        displayName: p.display_name, diet: p.diet, allergies: p.allergies || [], allergyOther: p.allergy_other || [],
        tastes, goal: p.goal, healthConsentAt: p.health_consent_at, onboarded: p.onboarded,
      } : EMPTY_PROFILE,
      pantry: (pantryRes.data || []).map((r: any) => ({ key: r.item_key, label: r.label, custom: r.custom })),
      favourites: (favRes.data || []).map((r: any) => ({ recipeId: r.recipe_id, title: r.title, image: r.image })),
    });
    const e = entRes.data;
    if (e?.is_premium && (!e.expires_at || new Date(e.expires_at) > new Date())) set({ premium: true });
  },

  async updateProfile(patch) {
    const uid = envReady ? get().session?.user.id : undefined;
    set({ profile: { ...get().profile, ...patch } });
    if (!uid) return;
    const { error } = await supabase.from('profiles').update(toRow(patch)).eq('id', uid);
    if (error) get().showToast("Couldn't save that. Check your connection and try again.");
  },

  async addPantry(items) {
    const uid = envReady ? get().session?.user.id : undefined;
    const existing = new Set(get().pantry.map((p) => p.key));
    const fresh = items.filter((i) => !existing.has(i.key));
    if (!fresh.length) return;
    set({ pantry: [...get().pantry, ...fresh] });
    if (uid) await supabase.from('pantry_items').upsert(fresh.map((i) => ({ user_id: uid, item_key: i.key, label: i.label, custom: i.custom })));
  },

  async removePantry(key) {
    set({ pantry: get().pantry.filter((p) => p.key !== key) });
    const uid = envReady ? get().session?.user.id : undefined;
    if (uid) await supabase.from('pantry_items').delete().eq('user_id', uid).eq('item_key', key);
  },

  async clearPantry() {
    set({ pantry: [] });
    const uid = envReady ? get().session?.user.id : undefined;
    if (uid) await supabase.from('pantry_items').delete().eq('user_id', uid);
  },

  async toggleFavourite(f) {
    const uid = envReady ? get().session?.user.id : undefined;
    const has = get().favourites.some((x) => x.recipeId === f.recipeId);
    if (has) {
      set({ favourites: get().favourites.filter((x) => x.recipeId !== f.recipeId) });
      if (uid) await supabase.from('favourites').delete().eq('user_id', uid).eq('recipe_id', f.recipeId);
      return 'removed';
    }
    if (!get().premium && get().favourites.length >= 10) return 'limit';
    set({ favourites: [f, ...get().favourites] });
    if (uid) {
      const { error } = await supabase.from('favourites').insert({ user_id: uid, recipe_id: f.recipeId, title: f.title, image: f.image });
      if (error) {
        set({ favourites: get().favourites.filter((x) => x.recipeId !== f.recipeId) });
        return error.message.includes('FREE_FAVOURITE_LIMIT') ? 'limit' : 'removed';
      }
    }
    return 'added';
  },

  showToast(msg) {
    set({ toast: msg });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: '' }), 2800);
  },
}));
