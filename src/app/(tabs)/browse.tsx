import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CUISINES } from '../../../supabase/functions/_shared/domain.ts';
import { Icon } from '@/components/Icon';
import { RecipeTile } from '@/components/RecipeCards';
import { Button, Chip, H1, Muted, Notice } from '@/components/ui';
import { api, type RecipeCard, type SearchFilters } from '@/lib/api';
import { openPaywall, openRecipe } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

type FreeKey = 'quick' | 'light' | 'vegetarian' | 'vegan';
type PremiumKey = 'highProtein' | 'lowCarb' | 'under10';

export default function Browse() {
  const params = useLocalSearchParams<{ cuisine?: string; vegan?: string }>();
  const premium = useApp((s) => s.premium);
  const profile = useApp((s) => s.profile);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(params.cuisine || null);
  const [filters, setFilters] = useState<SearchFilters>({ vegan: params.vegan === '1' });
  const [recipes, setRecipes] = useState<RecipeCard[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const reqId = useRef(0);

  useEffect(() => { if (params.cuisine) setCuisine(params.cuisine); }, [params.cuisine]);
  useEffect(() => { if (params.vegan === '1') setFilters((f) => ({ ...f, vegan: true })); }, [params.vegan]);
  useEffect(() => { const t = setTimeout(() => setDebounced(query.trim()), 400); return () => clearTimeout(t); }, [query]);

  useEffect(() => {
    const id = ++reqId.current;
    setRecipes(null); setError(false); setPage(0);
    api.search(debounced, cuisine, filters, 0)
      .then((r) => { if (id === reqId.current) { setRecipes(r.recipes); setHasMore(r.hasMore); } })
      .catch(() => { if (id === reqId.current) { setRecipes([]); setError(true); } });
  }, [debounced, cuisine, filters, premium, profile.diet, profile.allergies, profile.allergyOther, profile.tastes]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await api.search(debounced, cuisine, filters, page + 1);
      setRecipes((prev) => [...(prev || []), ...r.recipes.filter((x) => !(prev || []).some((p) => p.id === x.id))]);
      setPage(page + 1); setHasMore(r.hasMore);
    } catch { /* keep what we have */ } finally { setLoadingMore(false); }
  };

  const freeFilters: { key: FreeKey; label: string }[] = [
    { key: 'quick', label: 'Under 30 min' }, { key: 'light', label: 'Under 500 kcal' },
    ...(profile.diet === 'all' || profile.diet === 'pesc' ? [{ key: 'vegetarian' as const, label: 'Vegetarian' }] : []),
    ...(profile.diet !== 'vegan' ? [{ key: 'vegan' as const, label: 'Vegan' }] : []),
  ];
  const premiumFilters: { key: PremiumKey; label: string }[] = [
    { key: 'highProtein', label: 'High protein' }, { key: 'lowCarb', label: 'Low carb' }, { key: 'under10', label: 'Under 10 ingredients' },
  ];
  const filtering = profile.allergies.length + profile.allergyOther.length > 0 || profile.diet !== 'all' || profile.tastes.avoid.length > 0 || profile.tastes.meats.length < 7;

  const header = (
    <View style={{ gap: 14, paddingBottom: 14 }}>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        <H1>Browse</H1>
        <View style={st.search}>
          <Icon name="browse" size={20} color={colors.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Search dishes, e.g. curry" placeholderTextColor={colors.muted}
            returnKeyType="search" accessibilityLabel="Search recipes" style={st.input} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        <Chip label="All" selected={!cuisine} onPress={() => setCuisine(null)} />
        {CUISINES.map((c) => <Chip key={c} label={c} selected={cuisine === c} onPress={() => setCuisine(c)} />)}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 }}>
        {freeFilters.map((f) => (
          <Chip key={f.key} label={f.label} tone="soft" selected={!!filters[f.key]} onPress={() => setFilters({ ...filters, [f.key]: !filters[f.key] })} />
        ))}
        {premiumFilters.map((f) => (
          <Chip key={f.key} label={f.label} tone="soft" icon={premium ? undefined : 'lock'} selected={premium && !!filters[f.key]}
            onPress={() => (premium ? setFilters({ ...filters, [f.key]: !filters[f.key] }) : openPaywall('Extra filters like high protein and low carb come with Premium.'))} />
        ))}
      </View>
      {filtering ? <Muted style={{ paddingHorizontal: 20, color: colors.herbDark, fontFamily: fonts.medium }}>Showing recipes that suit your allergies, diet and tastes. Change this in Account.</Muted> : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <FlatList
        data={recipes || []}
        keyExtractor={(r) => r.id}
        numColumns={2}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 40 }}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 20, marginBottom: 12 }}
        renderItem={({ item, index }) => (
          <View style={{ flex: 1, maxWidth: '50%' }} key={item.id + index}>
            <RecipeTile recipe={item} onPress={() => openRecipe(item)} />
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          recipes === null ? <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} /> : (
            <View style={{ paddingHorizontal: 20 }}>
              <Notice tone="soft">{error ? "We couldn't load recipes. Check your connection and try again." : 'No recipes match. Try removing a filter.'}</Notice>
            </View>
          )
        }
        ListFooterComponent={
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            {loadingMore ? <ActivityIndicator color={colors.accent} /> : null}
            {!premium && recipes?.length ? (
              <Button label="Unlock the full recipe library" variant="gold" onPress={() => openPaywall('Open the full recipe library.')} />
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.chipLine, backgroundColor: colors.card },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink, paddingVertical: 10 },
});
