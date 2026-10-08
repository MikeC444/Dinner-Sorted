import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Share, View } from 'react-native';
import { key, matchPantry } from '../../supabase/functions/_shared/domain.ts';
import { BackLink } from '@/components/prefs';
import { RecipeRow } from '@/components/RecipeCards';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, H1, H2, Muted, Notice, Segmented } from '@/components/ui';
import { api, PremiumRequired, type RecipeCard } from '@/lib/api';
import { pantryTerms } from '@/lib/ingredients';
import { openPaywall, openRecipe } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors } from '@/theme';

type Day = { day: string; recipe: RecipeCard };

export default function MealPlan() {
  const { budget } = useLocalSearchParams<{ budget?: string }>();
  const pantry = useApp((s) => s.pantry);
  const [days, setDays] = useState<Day[] | null>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'plan' | 'shopping'>('plan');

  const load = () => {
    setDays(null); setError(false);
    api.plan(Number(budget) || 600, pantryTerms(pantry))
      .then((r) => setDays(r.days))
      .catch((e) => {
        if (e instanceof PremiumRequired) { router.back(); openPaywall('Get a weekly dinner plan built around your calorie target.'); return; }
        setError(true);
      });
  };
  useEffect(load, []);

  // Shopping list: everything the plan needs that isn't already in the kitchen, de-duplicated.
  const shopping = useMemo(() => {
    if (!days) return [];
    const terms = pantryTerms(pantry);
    const seen = new Map<string, { name: string; for: string[] }>();
    for (const d of days) {
      for (const name of matchPantry(d.recipe, terms).missing) {
        const k = key(name);
        const item = seen.get(k) || { name, for: [] };
        item.for.push(d.day);
        seen.set(k, item);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [days, pantry]);

  const shareList = () => Share.share({ message: 'Dinner Sorted shopping list\n\n' + shopping.map((s) => `• ${s.name}`).join('\n') });

  return (
    <Screen>
      <BackLink onPress={() => router.back()} />
      <H1>Your week</H1>
      <Muted>Seven dinners within about {budget || 600} kcal each, matched to your allergies, diet and tastes.</Muted>
      <Segmented options={[{ value: 'plan', label: 'Dinners' }, { value: 'shopping', label: 'Shopping list' }]} value={view} onChange={setView} />
      {days === null && !error ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 30 }} /> : null}
      {error ? <Notice tone="soft" icon="warning">We couldn't build your plan right now. Please try again.</Notice> : null}
      {days && view === 'plan' ? (
        <>
          {days.length < 7 ? <Notice tone="soft">We found {days.length} dinners that fit. Loosening your food preferences will give more choice.</Notice> : null}
          {days.map((d) => (
            <View key={d.day} style={{ gap: 6 }}>
              <H2 style={{ fontSize: 17 }}>{d.day}</H2>
              <RecipeRow recipe={d.recipe} onPress={() => openRecipe(d.recipe)} />
            </View>
          ))}
          <Button label="Swap in new dinners" variant="outline" onPress={load} />
        </>
      ) : null}
      {days && view === 'shopping' ? (
        <Card>
          {shopping.length ? shopping.map((s) => (
            <View key={s.name} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.soft }}>
              <Body style={{ flex: 1 }}>{s.name}</Body>
              <Muted>{s.for.join(', ')}</Muted>
            </View>
          )) : <Body>You already have everything. Nice.</Body>}
          {shopping.length ? <Button label="Share list" variant="dark" onPress={shareList} /> : null}
        </Card>
      ) : null}
    </Screen>
  );
}
