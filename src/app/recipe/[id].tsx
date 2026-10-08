import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALLERGENS, matchPantry } from '../../../supabase/functions/_shared/domain.ts';
import { Icon } from '@/components/Icon';
import { DishImage } from '@/components/RecipeCards';
import { Body, Button, DietTag, H1, IconButton, Muted, Notice, Segmented, Strong } from '@/components/ui';
import { api, PremiumRequired, type RecipeCard } from '@/lib/api';
import { pantryTerms } from '@/lib/ingredients';
import { openPaywall } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

type Tab = 'ingredients' | 'method' | 'nutrition';

function fmtAmount(n: number): string {
  if (n >= 100) return String(Math.round(n / 5) * 5);
  if (n >= 10) return String(Math.round(n));
  const r = Math.round(n * 4) / 4;
  const whole = Math.floor(r), frac = r - whole;
  const f = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
  return (whole ? String(whole) : '') + f || '¼';
}

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const premium = useApp((s) => s.premium);
  const pantry = useApp((s) => s.pantry);
  const favourites = useApp((s) => s.favourites);
  const { toggleFavourite, showToast } = useApp.getState();
  const [recipe, setRecipe] = useState<RecipeCard | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('ingredients');
  const [servings, setServings] = useState(2);

  useEffect(() => {
    api.detail(String(id))
      .then((r) => { setRecipe(r.recipe); setWarnings(r.warnings); setServings(r.recipe.servings || 2); })
      .catch((e) => {
        if (e instanceof PremiumRequired) { router.back(); openPaywall(`Unlock ${e.recipe?.title || 'this recipe'} and the full recipe library.`); return; }
        setError(true);
      });
  }, [id]);

  const match = useMemo(() => (recipe ? matchPantry(recipe, pantryTerms(pantry)) : null), [recipe, pantry]);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20, gap: 16 }}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <Notice tone="soft" icon="warning">We couldn't load this recipe. Check your connection and try again.</Notice>
      </SafeAreaView>
    );
  }
  if (!recipe) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View>;

  const ratio = servings / (recipe.servings || servings);
  const isFav = favourites.some((f) => f.recipeId === recipe.id);
  const n = recipe.nutrition;
  const missing = new Set(match?.missing || []);
  const allergenText = recipe.allergens.length
    ? 'Contains ' + recipe.allergens.map((a) => ALLERGENS.find((x) => x.key === a)?.label.toLowerCase()).join(', ') + '.'
    : 'None of the 14 main allergens in the listed ingredients.';

  const fav = async () => {
    const r = await toggleFavourite({ recipeId: recipe.id, title: recipe.title, image: recipe.image });
    if (r === 'limit') openPaywall('Free plans can save 10 favourites. Premium saves as many as you like.');
    else showToast(r === 'added' ? 'Saved to favourites' : 'Removed from favourites');
  };

  const macro = (label: string, val: number, ri: number, color: string) => {
    const pct = Math.round((100 * val) / ri);
    return (
      <View key={label} style={{ gap: 5 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Strong style={{ fontSize: 14 }}>{label}</Strong><Muted>{val}g · {pct}% RI</Muted></View>
        <View style={st.track}><View style={{ height: 8, width: `${Math.min(100, pct)}%`, backgroundColor: color }} /></View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View>
          <DishImage recipe={recipe} height={270 + insets.top} radius={0} artSize={72} />
          <View style={[st.heroButtons, { top: insets.top + 10 }]}>
            <IconButton icon="back" label="Back" onPress={() => router.back()} border={false} />
            <Pressable accessibilityRole="button" accessibilityLabel={isFav ? 'Remove from favourites' : 'Save to favourites'} onPress={fav} style={st.heart}>
              <Icon name="heart" color="#B3412A" fill={isFav ? '#B3412A' : 'none'} />
            </Pressable>
          </View>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {recipe.cuisine ? <Text style={st.cuisine}>{recipe.cuisine}</Text> : null}
              <DietTag vegan={recipe.vegan} vegetarian={recipe.vegetarian} />
            </View>
            <H1 style={{ fontSize: 30, lineHeight: 32 }}>{recipe.title}</H1>
            <View style={st.metaRow}>
              {recipe.minutes ? <Meta icon="clock" text={`${recipe.minutes} min`} /> : null}
              {n?.kcal ? <Meta icon="flame" text={`${n.kcal} kcal per serving`} /> : null}
              {match ? <Meta icon="kitchen" text={`You have ${match.have} of ${match.total}`} /> : null}
            </View>
          </View>

          {warnings.map((w) => <Notice key={w} tone="danger" icon="warning">{w}</Notice>)}

          <View style={st.box}>
            <Strong style={{ fontSize: 13 }}>Allergens</Strong>
            <Body style={{ fontSize: 14 }}>{allergenText}</Body>
            <Muted style={{ fontSize: 12 }}>Based on the listed ingredients. Check labels on stock, sauces, pastes and spice mixes, as brands vary.</Muted>
          </View>

          <View style={[st.box, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Strong>Servings</Strong>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconButton icon="minus" label="Fewer servings" onPress={() => setServings(Math.max(1, servings - 1))} />
              <Text style={st.servings}>{servings}</Text>
              <IconButton icon="plus" label="More servings" onPress={() => setServings(Math.min(12, servings + 1))} />
            </View>
          </View>

          <Segmented<Tab> options={[{ value: 'ingredients', label: 'Ingredients' }, { value: 'method', label: 'Method' }, { value: 'nutrition', label: 'Nutrition' }]}
            value={tab} onChange={setTab} />

          {tab === 'ingredients' ? (
            <View style={{ gap: 8 }}>
              <View style={st.list}>
                {recipe.ingredients.map((i, idx) => {
                  const scaled = i.amount && i.unit !== undefined && ratio !== 1
                    ? `${fmtAmount(i.amount * ratio)}${i.unit ? ' ' + i.unit : ''} ${i.name}` : i.original;
                  const need = missing.has(i.name);
                  return (
                    <View key={idx} style={st.ingRow}>
                      <Body style={{ flex: 1 }}>{scaled}</Body>
                      {need ? <Text style={st.need}>Need</Text> : <Icon name="check" size={18} color={colors.herbDark} strokeWidth={2.4} />}
                    </View>
                  );
                })}
              </View>
              <Muted>Oil, salt and pepper are assumed.{ratio !== 1 ? ' Quantities are adjusted for your servings where possible.' : ''}</Muted>
            </View>
          ) : null}

          {tab === 'method' ? (
            recipe.steps.length ? (
              <View style={{ gap: 10 }}>
                {recipe.steps.map((s, i) => (
                  <View key={i} style={st.step}>
                    <View style={st.stepNum}><Text style={st.stepNumText}>{i + 1}</Text></View>
                    <Body style={{ flex: 1 }}>{s}</Body>
                  </View>
                ))}
              </View>
            ) : (
              <Notice tone="soft">The method for this recipe is on {recipe.sourceName || 'the original website'}.</Notice>
            )
          ) : null}

          {tab === 'nutrition' ? (
            n ? (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={st.kcal}>{n.kcal}</Text>
                  <Muted>kcal per serving · {Math.round(n.kcal / 20)}% of a 2,000 kcal day</Muted>
                </View>
                <View style={[st.box, { gap: 12 }]}>
                  {macro('Protein', n.protein, 50, colors.herb)}
                  {macro('Carbohydrate', n.carbs, 260, '#1F6E8C')}
                  {macro('Fat', n.fat, 70, colors.accent)}
                </View>
                <View style={st.box}>
                  <Strong>Full nutrition</Strong>
                  {premium ? (
                    <>
                      {[['Fibre', n.fibre, 'g'], ['Sugars', n.sugars, 'g'], ['Saturated fat', n.satFat, 'g'], ['Salt', n.salt, 'g']].map(([l, v, u]) => (
                        v !== undefined ? <Row key={String(l)} label={String(l)} value={`${v}${u}`} /> : null
                      ))}
                      {(n.micros || []).map((m) => <Row key={m.name} label={m.name} value={`${m.amount}${m.unit}`} />)}
                    </>
                  ) : (
                    <>
                      <Muted>Fibre, sugars, saturated fat, salt and vitamins for every recipe.</Muted>
                      <Button label="See full nutrition" variant="dark" icon="lock" onPress={() => openPaywall('See the full nutrition breakdown for every recipe.')} />
                    </>
                  )}
                </View>
                <Muted style={{ fontSize: 12 }}>Per serving. RI = reference intake for an average adult. Figures come from the recipe source and are estimates.</Muted>
              </View>
            ) : <Notice tone="soft">Nutrition isn't available for this recipe.</Notice>
          ) : null}

          {recipe.sourceUrl ? (
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(recipe.sourceUrl!)} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <Icon name="external" size={16} color={colors.muted} />
              <Muted style={{ textDecorationLine: 'underline' }}>Recipe from {recipe.sourceName || 'the original website'}</Muted>
            </Pressable>
          ) : null}
          <Button label="Report a problem with this recipe" variant="ghost" icon="flag"
            onPress={() => router.push({ pathname: '/feedback', params: { category: 'recipe', context: recipe.title, recipeId: recipe.id } })} />
        </View>
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={st.footer}>
        {recipe.steps.length ? (
          <Button label="Start cooking" onPress={() => router.push({ pathname: '/cook/[id]', params: { id: recipe.id, title: recipe.title, steps: JSON.stringify(recipe.steps) } })} />
        ) : recipe.sourceUrl ? (
          <Button label={`View method on ${recipe.sourceName || 'source'}`} icon="external" onPress={() => Linking.openURL(recipe.sourceUrl!)} />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

function Meta({ icon, text }: { icon: 'clock' | 'flame' | 'kitchen'; text: string }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icon name={icon} size={16} color={colors.body} /><Text style={st.meta}>{text}</Text></View>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.soft }}>
      <Body style={{ fontSize: 14 }}>{label}</Body><Strong style={{ fontSize: 14 }}>{value}</Strong>
    </View>
  );
}

const st = StyleSheet.create({
  heroButtons: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  heart: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  cuisine: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.muted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
  meta: { fontFamily: fonts.body, fontSize: 14, color: colors.body },
  box: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, gap: 6 },
  servings: { minWidth: 32, textAlign: 'center', fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  list: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.soft },
  need: { fontFamily: fonts.bold, fontSize: 12, color: colors.danger, backgroundColor: colors.dangerTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  step: { flexDirection: 'row', gap: 14, padding: 14, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.line },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.herbTint, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.bold, color: colors.herbDark },
  kcal: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
  footer: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
});
