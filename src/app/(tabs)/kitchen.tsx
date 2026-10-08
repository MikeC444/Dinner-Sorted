import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Button, Chip, ChipWrap, H1, H2, Muted } from '@/components/ui';
import { api } from '@/lib/api';
import { CATALOGUE, CATEGORIES, itemAllowed, parseTyped, suggest, type CategoryId } from '@/lib/ingredients';
import { openPaywall } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

export default function Kitchen() {
  const pantry = useApp((s) => s.pantry);
  const profile = useApp((s) => s.profile);
  const premium = useApp((s) => s.premium);
  const left = useApp((s) => s.kitchenSearchesLeft);
  const { addPantry, removePantry, clearPantry, setKitchenSearchesLeft, showToast } = useApp.getState();
  const [typed, setTyped] = useState('');
  const [cat, setCat] = useState<CategoryId>('veg');

  useFocusEffect(useCallback(() => {
    api.usage().then((u) => setKitchenSearchesLeft(u.kitchenSearchesLeft)).catch(() => {});
  }, []));

  const allowed = useCallback((i: (typeof CATALOGUE)[number]) => itemAllowed(i, profile.diet, profile.tastes.meats), [profile.diet, profile.tastes.meats]);
  const have = pantry.map((p) => p.key);
  const suggestions = useMemo(() => suggest(typed, have, allowed), [typed, pantry, allowed]);
  const cats = CATEGORIES.filter((c) => CATALOGUE.some((i) => i.category === c.id && allowed(i)))
    .map((c) => (c.id === 'meat' && profile.diet === 'pesc' ? { ...c, label: 'Fish & seafood' } : c));
  const current = cats.some((c) => c.id === cat) ? cat : cats[0].id;

  const addTyped = () => {
    const items = parseTyped(typed);
    if (!items.length) { showToast('Type an ingredient first'); return; }
    addPantry(items);
    setTyped('');
    showToast(items.length === 1 ? `Added ${items[0].label}` : `Added ${items.length} ingredients`);
  };

  const out = !premium && left === 0;
  const note = premium ? 'Unlimited searches with Premium' : left === null ? 'Free plan: 3 searches a day' : left > 0 ? `${left} of 3 free searches left today` : "You've used today's free searches";

  return (
    <Screen footer={
      <>
        <Muted style={{ textAlign: 'center' }}>{note}</Muted>
        <Button
          label={out ? 'Get unlimited searches' : pantry.length ? `Find dinners with ${pantry.length} ingredient${pantry.length === 1 ? '' : 's'}` : 'Add some ingredients'}
          variant={out ? 'dark' : 'primary'} disabled={!out && !pantry.length}
          onPress={() => (out ? openPaywall("You've used today's 3 free kitchen searches.") : router.push('/kitchen-results'))} />
      </>
    }>
      <View style={{ gap: 6 }}>
        <H1>My kitchen</H1>
        <Muted>Type what you've got or tap from the list. We'll assume oil, salt and pepper.</Muted>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={st.inputWrap}>
          <Icon name="plus" size={20} color={colors.muted} />
          <TextInput value={typed} onChangeText={setTyped} onSubmitEditing={addTyped} returnKeyType="done" autoCapitalize="none"
            placeholder="e.g. tofu, feta, mushrooms" placeholderTextColor={colors.muted} accessibilityLabel="Type an ingredient" style={st.input} />
        </View>
        <Button label="Add" variant="dark" onPress={addTyped} style={{ minHeight: 50 }} />
      </View>
      {suggestions.length ? (
        <ChipWrap>
          {suggestions.map((s) => <Chip key={s.key} label={'+ ' + s.label} tone="soft" onPress={() => { addPantry([{ key: s.key, label: s.label, custom: false }]); setTyped(''); }} />)}
        </ChipWrap>
      ) : null}
      <Muted>Add several at once with commas. Anything we don't recognise is still used to match recipes.</Muted>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H2>In your kitchen ({pantry.length})</H2>
        {pantry.length ? <Button label="Clear all" variant="ghost" onPress={clearPantry} style={{ minHeight: 36, paddingHorizontal: 0 }} /> : null}
      </View>
      {pantry.length ? (
        <ChipWrap>
          {pantry.map((p) => <Chip key={p.key} label={p.label} tone={p.custom ? 'danger' : 'soft'} selected icon="close"
            accessibilityLabel={`Remove ${p.label}`} onPress={() => removePantry(p.key)} />)}
        </ChipWrap>
      ) : <Muted>Nothing added yet.</Muted>}

      <H2>Add from the list</H2>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {cats.map((c) => {
          const n = CATALOGUE.filter((i) => i.category === c.id && have.includes(i.key) && allowed(i)).length;
          return <Chip key={c.id} label={n ? `${c.label} · ${n}` : c.label} selected={current === c.id} onPress={() => setCat(c.id)} />;
        })}
      </ScrollView>
      <ChipWrap>
        {CATALOGUE.filter((i) => i.category === current && allowed(i)).map((i) => {
          const on = have.includes(i.key);
          return <Chip key={i.key} label={i.label} selected={on}
            onPress={() => (on ? removePantry(i.key) : addPantry([{ key: i.key, label: i.label, custom: false }]))} />;
        })}
      </ChipWrap>
    </Screen>
  );
}

const st = StyleSheet.create({
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.chipLine, backgroundColor: colors.card },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink, paddingVertical: 10 },
});
