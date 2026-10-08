import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CUISINES } from '../../../supabase/functions/_shared/domain.ts';
import { Icon } from '@/components/Icon';
import { RecipeRow } from '@/components/RecipeCards';
import { Body, Button, Chip, ChipWrap, Eyebrow, H1, H2, Muted, Notice } from '@/components/ui';
import { api, type RecipeCard } from '@/lib/api';
import { pantryTerms } from '@/lib/ingredients';
import { calcGoal, checkGoal } from '@/lib/nutrition';
import { openPaywall, openRecipe } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

function dayLine() {
  const d = new Date();
  const part = d.getHours() < 12 ? 'morning' : d.getHours() < 17 ? 'afternoon' : 'evening';
  return d.toLocaleDateString('en-GB', { weekday: 'long' }) + ' ' + part;
}

export default function Tonight() {
  const pantry = useApp((s) => s.pantry);
  const profile = useApp((s) => s.profile);
  const premium = useApp((s) => s.premium);
  const [picks, setPicks] = useState<RecipeCard[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try { setPicks((await api.suggest(pantryTerms(pantry))).recipes); } catch { setError(true); setPicks([]); }
  }, [pantry, profile.diet, profile.allergies, profile.allergyOther, profile.tastes]);

  useEffect(() => { load(); }, [load]);

  const goal = profile.goal && checkGoal(profile.goal).ok ? calcGoal(profile.goal) : null;
  const vegLabel = profile.diet === 'vegan' ? ', all vegan' : profile.diet === 'veg' ? ', all vegetarian' : profile.diet === 'pesc' ? ', all pescatarian' : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={{ gap: 4 }}>
          <Muted>{dayLine()}</Muted>
          <H1>What's for dinner?</H1>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.navigate('/kitchen')} style={({ pressed }) => [st.hero, pressed && { opacity: 0.92 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ gap: 4, flex: 1 }}>
              <Text style={st.heroTitle}>Cook with what you've got</Text>
              <Text style={st.heroSub}>{pantry.length} ingredient{pantry.length === 1 ? '' : 's'} in your kitchen</Text>
            </View>
            <Icon name="kitchen" color={colors.white} size={28} strokeWidth={1.8} />
          </View>
          <View style={st.heroPill}><Text style={st.heroPillText}>Update my kitchen and find dinners</Text></View>
        </Pressable>

        {goal && profile.healthConsentAt ? (
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/goals')} style={st.budget}>
            <View style={{ flex: 1, gap: 2 }}>
              <Muted style={{ fontFamily: fonts.medium }}>Tonight's dinner budget</Muted>
              <Text style={st.budgetNum}>About {goal.dinnerKcal.toLocaleString('en-GB')} kcal</Text>
              <Muted>From your daily target of {goal.dailyKcal.toLocaleString('en-GB')} kcal</Muted>
            </View>
            <Icon name="chevron" color={colors.muted} />
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/goals')} style={st.goalPrompt}>
            <Icon name="goals" color={colors.accent} size={26} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.ink }}>Set a weight goal</Text>
              <Muted>Get a daily calorie target and dinners that fit it</Muted>
            </View>
          </Pressable>
        )}

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <H2>Picked for you</H2>
            <Button label="Edit tastes" variant="ghost" onPress={() => router.push('/edit-tastes')} style={{ minHeight: 36, paddingHorizontal: 0 }} />
          </View>
          <Muted style={{ marginTop: -8 }}>Based on your tastes and what's in your kitchen{vegLabel}</Muted>
          {picks === null ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} /> : null}
          {error ? <Notice tone="soft" icon="warning">We couldn't load suggestions. Pull down to try again.</Notice> : null}
          {picks && !error && picks.length === 0 ? (
            <Notice tone="soft">Nothing matches your tastes right now. Try loosening your food preferences, or add more to your kitchen.</Notice>
          ) : null}
          {picks?.slice(0, 5).map((r) => <RecipeRow key={r.id} recipe={r} onPress={() => openRecipe(r)} showReason />)}
        </View>

        <View style={{ gap: 10 }}>
          <H2>Explore</H2>
          <ChipWrap>
            <Chip label="Vegan dinners" tone="herb" selected onPress={() => router.navigate({ pathname: '/browse', params: { vegan: '1' } })} />
            {CUISINES.slice(0, 12).map((c) => <Chip key={c} label={c} onPress={() => router.navigate({ pathname: '/browse', params: { cuisine: c } })} />)}
          </ChipWrap>
        </View>

        {!premium ? (
          <View style={st.premium}>
            <Eyebrow style={st.premiumBadge}>Premium</Eyebrow>
            <Text style={st.premiumTitle}>Plan the whole week in one tap</Text>
            <Body style={{ color: '#4A4330' }}>Seven dinners built around your calorie target, a shopping list ready to go, and the full recipe library.</Body>
            <Button label="See what's included" variant="dark" onPress={() => openPaywall('Plan the whole week around your goal.')} style={{ alignSelf: 'flex-start' }} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  content: { padding: 20, paddingTop: 12, gap: 22, paddingBottom: 40 },
  hero: { backgroundColor: colors.accent, borderRadius: 20, padding: 20, gap: 14 },
  heroTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.white, letterSpacing: -0.4 },
  heroSub: { fontFamily: fonts.body, fontSize: 14, color: colors.white },
  heroPill: { alignSelf: 'flex-start', backgroundColor: colors.white, borderRadius: 999, paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  heroPillText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  budget: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  budgetNum: { fontFamily: fonts.display, fontSize: 26, color: colors.ink, letterSpacing: -0.5 },
  goalPrompt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.dashed },
  premium: { gap: 10, padding: 20, borderRadius: 20, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.goldLine },
  premiumBadge: { alignSelf: 'flex-start', backgroundColor: colors.gold, color: colors.goldInk, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  premiumTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
});
