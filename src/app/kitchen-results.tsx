import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { BackLink } from '@/components/prefs';
import { RecipeRow } from '@/components/RecipeCards';
import { Screen } from '@/components/Screen';
import { Button, H1, Muted, Notice } from '@/components/ui';
import { api, PremiumRequired, type RecipeCard } from '@/lib/api';
import { pantryTerms } from '@/lib/ingredients';
import { openPaywall, openRecipe } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors } from '@/theme';

export default function KitchenResults() {
  const pantry = useApp((s) => s.pantry);
  const premium = useApp((s) => s.premium);
  const diet = useApp((s) => s.profile.diet);
  const [recipes, setRecipes] = useState<RecipeCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // one search per visit
    started.current = true;
    api.pantry(pantryTerms(pantry))
      .then((r) => { setRecipes(r.recipes); useApp.getState().setKitchenSearchesLeft(r.kitchenSearchesLeft); })
      .catch((e) => {
        if (e instanceof PremiumRequired) { router.back(); openPaywall("You've used today's 3 free kitchen searches."); return; }
        setError("We couldn't search right now. Check your connection and try again.");
      });
  }, []);

  const makeable = (recipes || []).filter((r) => (r.match?.pct || 0) >= 60).length;
  const dietWord = diet === 'vegan' ? ', vegan only' : diet === 'veg' ? ', vegetarian only' : diet === 'pesc' ? ', pescatarian only' : '';

  return (
    <Screen>
      <BackLink onPress={() => router.back()} />
      <H1>{recipes === null ? 'Finding dinners…' : makeable ? `${makeable} dinner${makeable === 1 ? '' : 's'} you can make or nearly make` : 'Closest matches'}</H1>
      <Muted>Best matches first, using your {pantry.length} ingredients{dietWord}. Allergies are always filtered out.</Muted>
      {recipes === null && !error ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} /> : null}
      {error ? <Notice tone="soft" icon="warning">{error}</Notice> : null}
      {recipes && recipes.length === 0 ? (
        <Notice tone="soft">No matches yet. Try adding a main ingredient such as chicken, tofu, beans or pasta.</Notice>
      ) : null}
      {recipes?.map((r) => <RecipeRow key={r.id} recipe={r} showMatch onPress={() => openRecipe(r)} />)}
      {recipes && !premium ? (
        <>
          <Muted style={{ textAlign: 'center' }}>Premium recipes show in your matches so you can see what you're missing.</Muted>
          <Button label="See Premium" variant="gold" onPress={() => openPaywall('Unlimited kitchen searches and the full recipe library.')} />
        </>
      ) : null}
    </Screen>
  );
}
