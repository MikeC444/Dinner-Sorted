import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ALLERGENS, CUISINES } from '../../../supabase/functions/_shared/domain.ts';
import { Icon } from '@/components/Icon';
import { DishImage, RecipeRow } from '@/components/RecipeCards';
import { Avatar, Ring, SearchBar, WhiskMark } from '@/components/home';
import { Body, Button, Chip, ChipWrap, Eyebrow, Muted, Notice } from '@/components/ui';
import { api, type RecipeCard } from '@/lib/api';
import { pantryTerms } from '@/lib/ingredients';
import { calcGoal, checkGoal } from '@/lib/nutrition';
import { openPaywall, openRecipe } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors, fonts, toneFor } from '@/theme';

export default function Tonight() {
  const pantry = useApp((s) => s.pantry);
  const profile = useApp((s) => s.profile);
  const premium = useApp((s) => s.premium);
  const [picks, setPicks] = useState<RecipeCard[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cuisinePics, setCuisinePics] = useState<Record<string, RecipeCard | undefined>>({});
  const favourites = useApp((s) => s.favourites);

  const load = useCallback(async () => {
    setError(false);
    try { setPicks((await api.suggest(pantryTerms(pantry))).recipes); } catch { setError(true); setPicks([]); }
  }, [pantry, profile.diet, profile.allergies, profile.allergyOther, profile.tastes]);

  useEffect(() => { load(); }, [load]);

  // Cuisine tiles: their favourite cuisines, else a few popular ones. Each shows the photo of a real recipe from that cuisine.
  const tileCuisines = (profile.tastes.cuisines.length ? profile.tastes.cuisines : ['Italian', 'Mexican', 'Indian']).slice(0, 3);
  const tileKey = tileCuisines.join('|');
  useEffect(() => {
    let live = true;
    Promise.all(tileCuisines.map((c) => api.search('', c, {}).then((r) => [c, r.recipes.find((x) => x.image)] as const).catch(() => [c, undefined] as const)))
      .then((rows) => { if (live) setCuisinePics(Object.fromEntries(rows)); });
    return () => { live = false; };
  }, [tileKey]);

  const toggleSave = async (r: RecipeCard) => {
    const res = await useApp.getState().toggleFavourite({ recipeId: r.id, title: r.title, image: r.image });
    if (res === 'limit') openPaywall('Free plans can save 10 favourites. Premium saves as many as you like.');
    else useApp.getState().showToast(res === 'added' ? 'Saved' : 'Removed from saved');
  };

  const goal = profile.goal && checkGoal(profile.goal).ok ? calcGoal(profile.goal) : null;
  const dietLabel = profile.diet === 'vegan' ? 'Vegan' : profile.diet === 'veg' ? 'Vegetarian' : profile.diet === 'pesc' ? 'Pescatarian' : null;
  const prefChips = [
    ...(dietLabel ? [dietLabel] : []),
    ...profile.allergies.map((a) => (ALLERGENS.find((x) => x.key === a)?.label ?? a) + '-free'),
  ].slice(0, 2);
  const shown = pantry.slice(0, 4);
  const feature = picks?.[0];
  const more = picks?.slice(1, 5) ?? [];
  const fm = feature?.match;
  const isSaved = (id: string) => favourites.some((f) => f.recipeId === id);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <View style={st.header}>
          <WhiskMark size={44} />
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={st.title}>What's for dinner?</Text>
            <Text style={st.tagline}>Good food, already in your kitchen.</Text>
          </View>
          <Avatar name={profile.displayName} />
        </View>

        <SearchBar onPress={() => router.navigate('/browse')} onFilters={() => router.push('/edit-tastes')} />

        <View style={st.kitchen}>
          <View style={st.rowBetween}>
            <View style={st.row}>
              <Icon name="kitchen" size={26} color={colors.herbDark} />
              <Text style={st.cardTitle}>Your kitchen</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/kitchen')} style={st.row} hitSlop={8}>
              <Icon name="pencil" size={18} color={colors.herbDark} />
              <Text style={st.link}>Edit</Text>
            </Pressable>
          </View>
          {shown.length ? (
            <View style={st.row}>
              {shown.map((p) => <View key={p.key} style={st.pantryChip}><Text style={st.pantryText} numberOfLines={1}>{p.label}</Text></View>)}
              {pantry.length > shown.length ? <View style={[st.pantryChip, { backgroundColor: colors.herbTint }]}><Text style={[st.pantryText, { color: colors.herbDark, fontFamily: fonts.bold }]}>+{pantry.length - shown.length}</Text></View> : null}
            </View>
          ) : <Muted>Nothing here yet. Add what you've got and we'll find dinners.</Muted>}
          <Pressable accessibilityRole="button" onPress={() => router.navigate('/kitchen')} style={({ pressed }) => [st.cta, pressed && { opacity: 0.9 }]}>
            <Text style={st.ctaText}>{pantry.length ? 'Find my dinner' : 'Add ingredients'}</Text>
            <Icon name="arrow" size={20} color={colors.white} />
          </Pressable>
        </View>

        <View style={st.row}>
          {prefChips.map((l, i) => (
            <View key={l} style={[st.pref, i === 0 ? { backgroundColor: colors.herbTint } : { backgroundColor: colors.accentTint }]}>
              <Icon name="leaf" size={18} color={i === 0 ? colors.herbDark : colors.accentDark} />
              <Text style={[st.prefText, { color: i === 0 ? colors.herbDark : colors.accentDark }]} numberOfLines={1}>{l}</Text>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => router.push('/edit-tastes')} style={[st.pref, st.prefBtn]}>
            <Icon name="sliders" size={18} color={colors.body} />
            <Text style={[st.prefText, { color: colors.body }]}>Preferences</Text>
            <Icon name="chevron" size={16} color={colors.body} />
          </Pressable>
        </View>

        <View style={{ gap: 12 }}>
          <View style={st.rowBetween}>
            <Text accessibilityRole="header" style={st.h2}>Cook with what you have</Text>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/kitchen')} style={st.row} hitSlop={8}>
              <Text style={st.link}>See all</Text><Icon name="chevron" size={16} color={colors.herbDark} />
            </Pressable>
          </View>
          {picks === null ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} /> : null}
          {error ? <Notice tone="soft" icon="warning">We couldn't load suggestions. Pull down to try again.</Notice> : null}
          {picks && !error && picks.length === 0 ? (
            <Notice tone="soft">Nothing matches your tastes right now. Try loosening your food preferences, or add more to your kitchen.</Notice>
          ) : null}
          {feature ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`${feature.title}${feature.locked ? ', Premium recipe' : ''}`} onPress={() => openRecipe(feature)}
              style={({ pressed }) => [st.feature, pressed && { opacity: 0.93 }]}>
              <View>
                <DishImage recipe={feature} height={210} radius={0} artSize={64} />
                {fm ? (
                  <View style={st.badge}>
                    <Icon name="check" size={14} color={colors.herbDark} strokeWidth={3} />
                    <Text style={st.badgeText}>{fm.missing.length ? `You have ${fm.have} of ${fm.total} ingredients` : `You have all ${fm.total} ingredients`}</Text>
                  </View>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel={isSaved(feature.id) ? 'Remove from saved' : 'Save recipe'} onPress={() => toggleSave(feature)} style={st.save}>
                  <Icon name="bookmark" size={20} color={colors.ink} fill={isSaved(feature.id) ? colors.ink : 'none'} />
                </Pressable>
              </View>
              <View style={{ padding: 16, gap: 10 }}>
                <Text style={st.featureTitle} numberOfLines={2}>{feature.title}</Text>
                <View style={st.metaRow}>
                  {feature.minutes ? <View style={st.row}><Icon name="clock" size={18} color={colors.muted} /><Text style={st.meta}>{feature.minutes} min</Text></View> : null}
                  {feature.nutrition?.kcal ? <View style={st.row}><Icon name="flame" size={18} color={colors.muted} /><Text style={st.meta}>{feature.nutrition.kcal} kcal</Text></View> : null}
                  {feature.nutrition?.protein ? <View style={st.row}><Icon name="list" size={18} color={colors.muted} /><Text style={st.meta}>{Math.round(feature.nutrition.protein)}g protein</Text></View> : null}
                </View>
                {feature.reason ? <Text style={st.reason}>{feature.reason}</Text> : null}
              </View>
            </Pressable>
          ) : null}
          {more.length ? <Muted style={{ fontFamily: fonts.medium }}>More picks for you</Muted> : null}
          {more.map((r) => <RecipeRow key={r.id} recipe={r} onPress={() => openRecipe(r)} showReason />)}
        </View>

        <View style={{ gap: 12 }}>
          <View style={st.rowBetween}>
            <Text accessibilityRole="header" style={st.h2}>Explore cuisines</Text>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/browse')} hitSlop={8}><Text style={st.sub}>See all recipes</Text></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {tileCuisines.map((c) => {
              const pic = cuisinePics[c];
              return (
                <Pressable key={c} accessibilityRole="button" accessibilityLabel={`${c} recipes`}
                  onPress={() => router.navigate({ pathname: '/browse', params: { cuisine: c } })}
                  style={({ pressed }) => [st.cuisine, { backgroundColor: toneFor(c) }, pressed && { opacity: 0.9 }]}>
                  {pic?.image ? <Image source={{ uri: pic.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
                  <View style={st.cuisineShade} />
                  <Text style={st.cuisineText}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
          <ChipWrap>
            <Chip label="Vegan dinners" tone="herb" selected onPress={() => router.navigate({ pathname: '/browse', params: { vegan: '1' } })} />
            {CUISINES.filter((c) => !tileCuisines.includes(c)).slice(0, 8).map((c) => <Chip key={c} label={c} onPress={() => router.navigate({ pathname: '/browse', params: { cuisine: c } })} />)}
          </ChipWrap>
        </View>

        <Pressable accessibilityRole="button" onPress={() => router.navigate('/goals')} style={st.goals}>
          <Ring pct={goal && profile.healthConsentAt ? 0.75 : 0.25} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.cardTitle}>Your nutrition goals</Text>
            <Muted>{goal && profile.healthConsentAt ? `About ${goal.dinnerKcal.toLocaleString('en-GB')} kcal for tonight's dinner` : 'Set a goal to get meals that fit your daily targets'}</Muted>
          </View>
          <View style={st.row}><Text style={st.link}>{goal && profile.healthConsentAt ? 'View goals' : 'Set goal'}</Text><Icon name="chevron" size={16} color={colors.herbDark} /></View>
        </Pressable>

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
  content: { padding: 20, paddingTop: 12, gap: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.serifBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5, color: colors.ink },
  tagline: { fontFamily: fonts.body, fontSize: 15, color: colors.body },
  h2: { fontFamily: fonts.serifBold, fontSize: 22, lineHeight: 28, color: colors.ink, flexShrink: 1 },
  cardTitle: { fontFamily: fonts.serifBold, fontSize: 20, color: colors.ink },
  link: { fontFamily: fonts.bold, fontSize: 15, color: colors.herbDark },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  kitchen: { gap: 14, padding: 16, borderRadius: 20, backgroundColor: colors.herbTint, borderWidth: 1, borderColor: '#D4E8DA' },
  pantryChip: { flexShrink: 1, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  pantryText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  cta: { flexDirection: 'row', gap: 10, height: 56, borderRadius: 16, backgroundColor: colors.herbDark, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  pref: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 14, borderRadius: 24, flexShrink: 1 },
  prefBtn: { flex: 1, justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.chipLine },
  prefText: { fontFamily: fonts.bold, fontSize: 15, flexShrink: 1 },
  feature: { borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  badge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.herbTint },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, color: colors.herbDark },
  save: { position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontFamily: fonts.serifBold, fontSize: 24, lineHeight: 30, color: colors.ink },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 18, rowGap: 6 },
  meta: { fontFamily: fonts.body, fontSize: 15, color: colors.body },
  reason: { fontFamily: fonts.medium, fontSize: 14, color: colors.herbDark },
  cuisine: { flex: 1, height: 112, borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end', padding: 12 },
  cuisineShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  cuisineText: { fontFamily: fonts.bold, fontSize: 17, color: colors.white },
  goals: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  premium: { gap: 10, padding: 20, borderRadius: 20, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.goldLine },
  premiumBadge: { alignSelf: 'flex-start', backgroundColor: colors.gold, color: colors.goldInk, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  premiumTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
});
