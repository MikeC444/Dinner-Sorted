// Forms shared by onboarding and Account > edit: how you eat, allergies, and food preferences.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ALLERGENS, AVOID_OPTIONS, CUISINES, VEG_OPTIONS, key,
} from '../../supabase/functions/_shared/domain.ts';
import type { AllergenKey, Diet, MeatGroup, Spice, Tastes } from '../../supabase/functions/_shared/domain.ts';
import { colors, fonts } from '../theme';
import { Icon } from './Icon';
import { Button, Chip, ChipWrap, H3, Muted, Notice, Segmented } from './ui';

// ---------- Diet ----------

export const DIETS: { value: Diet; label: string; sub: string }[] = [
  { value: 'all', label: 'Everything', sub: 'Meat, fish and veg' },
  { value: 'pesc', label: 'Pescatarian', sub: 'Fish and veg, no meat' },
  { value: 'veg', label: 'Vegetarian', sub: 'No meat or fish' },
  { value: 'vegan', label: 'Vegan', sub: 'No animal products' },
];

export function DietCards({ value, onChange }: { value: Diet; onChange: (d: Diet) => void }) {
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
      {DIETS.map((d) => {
        const on = d.value === value;
        return (
          <Pressable key={d.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(d.value)}
            style={[pf.radioCard, { borderColor: on ? colors.accent : colors.line }]}>
            <View style={[pf.radio, { borderColor: on ? colors.accent : colors.chipLine }]}>{on ? <View style={pf.dot} /> : null}</View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={pf.radioTitle}>{d.label}</Text>
              <Muted>{d.sub}</Muted>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DietSegmented({ value, onChange }: { value: Diet; onChange: (d: Diet) => void }) {
  return <Segmented small options={DIETS.map((d) => ({ value: d.value, label: d.label }))} value={value} onChange={onChange} />;
}

// ---------- Allergies ----------

export interface AllergyValue { allergies: AllergenKey[]; allergyOther: string[]; none: boolean }

export function allergySummary(v: { allergies: AllergenKey[]; allergyOther: string[] }): string {
  const list = [
    ...v.allergies.map((a) => ALLERGENS.find((x) => x.key === a)?.label || a),
    ...v.allergyOther.map((o) => o.charAt(0).toUpperCase() + o.slice(1)),
  ];
  return list.length ? 'Avoiding: ' + list.join(', ') : 'No allergies or intolerances';
}

export function AllergyForm({ value, onChange }: { value: AllergyValue; onChange: (v: AllergyValue) => void }) {
  const [typed, setTyped] = useState('');
  const toggle = (a: AllergenKey) => {
    const has = value.allergies.includes(a);
    onChange({ ...value, none: false, allergies: has ? value.allergies.filter((x) => x !== a) : [...value.allergies, a] });
  };
  const add = () => {
    const parts = typed.split(/[,;\n]/).map((x) => key(x)).filter((x) => x.length >= 2);
    if (!parts.length) return;
    onChange({ ...value, none: false, allergyOther: Array.from(new Set([...value.allergyOther, ...parts])) });
    setTyped('');
  };
  const noneOn = value.none && !value.allergies.length && !value.allergyOther.length;
  return (
    <View style={{ gap: 18 }}>
      <Pressable accessibilityRole="radio" accessibilityState={{ checked: noneOn }}
        onPress={() => onChange({ allergies: [], allergyOther: [], none: true })}
        style={[pf.radioCard, { borderColor: noneOn ? colors.accent : colors.line }]}>
        <View style={[pf.radio, { borderColor: noneOn ? colors.accent : colors.chipLine }]}>{noneOn ? <View style={pf.dot} /> : null}</View>
        <Text style={pf.radioTitle}>No allergies or intolerances</Text>
      </Pressable>

      <View style={{ gap: 10 }}>
        <H3>The 14 main allergens</H3>
        <ChipWrap>
          {ALLERGENS.map((a) => (
            <Chip key={a.key} label={a.label} tone="danger" selected={value.allergies.includes(a.key)}
              icon={value.allergies.includes(a.key) ? 'check' : undefined} onPress={() => toggle(a.key)} />
          ))}
        </ChipWrap>
      </View>

      <View style={{ gap: 10 }}>
        <H3>Anything else?</H3>
        <Muted>For example kiwi, garlic or nightshades. Separate several with commas.</Muted>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput value={typed} onChangeText={setTyped} onSubmitEditing={add} returnKeyType="done" placeholder="Type an allergy"
            placeholderTextColor={colors.muted} accessibilityLabel="Other allergy or intolerance" style={pf.input} autoCapitalize="none" />
          <Button label="Add" variant="dark" onPress={add} style={{ minHeight: 50 }} />
        </View>
        {value.allergyOther.length ? (
          <ChipWrap>
            {value.allergyOther.map((o) => (
              <Chip key={o} label={o.charAt(0).toUpperCase() + o.slice(1)} tone="danger" selected icon="close"
                accessibilityLabel={`Remove ${o}`} onPress={() => onChange({ ...value, allergyOther: value.allergyOther.filter((x) => x !== o) })} />
            ))}
          </ChipWrap>
        ) : null}
      </View>

      <Notice tone="gold" icon="warning">
        We filter recipes by their listed ingredients, but brands vary, especially stock cubes, sauces, curry pastes and spice mixes.
        Always check the labels on what you buy. For a severe allergy, follow your doctor's advice.
      </Notice>
    </View>
  );
}

// ---------- Tastes ----------

const MEATS: { value: MeatGroup; label: string }[] = [
  { value: 'chicken', label: 'Chicken' }, { value: 'beef', label: 'Beef' }, { value: 'pork', label: 'Pork' },
  { value: 'lamb', label: 'Lamb' }, { value: 'turkey', label: 'Turkey' },
];
const FISH: { value: MeatGroup; label: string }[] = [{ value: 'fish', label: 'Fish' }, { value: 'seafood', label: 'Prawns and seafood' }];

export function tastesSummary(t: Tastes): string {
  const likes: string[] = [];
  if (t.cuisines.length) likes.push(t.cuisines.slice(0, 2).join(', ') + (t.cuisines.length > 2 ? ` +${t.cuisines.length - 2}` : ''));
  if (t.veg.length) likes.push(`${t.veg.length} veg`);
  const avoids = AVOID_OPTIONS.filter((a) => t.avoid.includes(a.key)).map((a) => a.label.toLowerCase());
  return (likes.length ? 'Likes ' + likes.join(' and ') : 'No favourites picked yet')
    + (avoids.length ? ' · avoids ' + avoids.slice(0, 2).join(', ') + (avoids.length > 2 ? ` +${avoids.length - 2}` : '') : '')
    + ` · ${t.spice} spice`;
}

export function TastesForm({ diet, value, onChange }: { diet: Diet; value: Tastes; onChange: (t: Tastes) => void }) {
  const toggle = <K extends 'meats' | 'veg' | 'cuisines' | 'avoid'>(field: K, v: string) => {
    const list = value[field] as string[];
    onChange({ ...value, [field]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };
  return (
    <View style={{ gap: 22 }}>
      {diet === 'all' ? (
        <View style={{ gap: 10 }}>
          <H3>Meat you eat</H3>
          <Muted>Untick any you don't eat. We'll leave those dishes out.</Muted>
          <ChipWrap>
            {MEATS.map((m) => {
              const on = value.meats.includes(m.value);
              return <Chip key={m.value} label={m.label} selected={on} icon={on ? 'check' : undefined} onPress={() => toggle('meats', m.value)} />;
            })}
          </ChipWrap>
        </View>
      ) : null}
      {diet === 'all' || diet === 'pesc' ? (
        <View style={{ gap: 10 }}>
          <H3>Fish and seafood</H3>
          <Muted>Untick any you don't eat.</Muted>
          <ChipWrap>
            {FISH.map((m) => {
              const on = value.meats.includes(m.value);
              return <Chip key={m.value} label={m.label} selected={on} icon={on ? 'check' : undefined} onPress={() => toggle('meats', m.value)} />;
            })}
          </ChipWrap>
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        <H3>Veg you love</H3>
        <Muted>Pick as many as you like. We'll show more dinners with these.</Muted>
        <ChipWrap>
          {VEG_OPTIONS.map((v) => <Chip key={v.key} label={v.label} selected={value.veg.includes(v.key)} onPress={() => toggle('veg', v.key)} />)}
        </ChipWrap>
      </View>
      <View style={{ gap: 10 }}>
        <H3>Favourite cuisines</H3>
        <Muted>These go to the top of your suggestions.</Muted>
        <ChipWrap>
          {CUISINES.map((c) => <Chip key={c} label={c} selected={value.cuisines.includes(c)} onPress={() => toggle('cuisines', c)} />)}
        </ChipWrap>
      </View>
      <View style={{ gap: 10 }}>
        <H3>How spicy do you like it?</H3>
        <Segmented<Spice> options={[{ value: 'mild', label: 'Mild' }, { value: 'medium', label: 'Medium' }, { value: 'hot', label: 'Hot' }]}
          value={value.spice} onChange={(spice) => onChange({ ...value, spice })} />
      </View>
      <View style={{ gap: 10 }}>
        <H3>Anything you'd rather avoid?</H3>
        <Muted>Dishes with these won't be suggested. This is for tastes, not allergies.</Muted>
        <ChipWrap>
          {AVOID_OPTIONS.filter((a) => !(diet === 'vegan' && a.animal)).map((a) => {
            const on = value.avoid.includes(a.key);
            return <Chip key={a.key} label={a.label} tone="danger" selected={on} icon={on ? 'close' : undefined} onPress={() => toggle('avoid', a.key)} />;
          })}
        </ChipWrap>
      </View>
    </View>
  );
}

// ---------- Step header ----------

export function StepHeader({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < step ? colors.accent : '#E8DFD3' }} />
        ))}
      </View>
      <Text style={pf.step}>Step {step} of {total}</Text>
    </View>
  );
}

export function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onPress} hitSlop={8}
      style={{ width: 44, height: 44, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="back" />
    </Pressable>
  );
}

const pf = StyleSheet.create({
  radioCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 2, backgroundColor: colors.card },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  radioTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  input: { flex: 1, minHeight: 50, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.chipLine,
    backgroundColor: colors.card, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  step: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.muted },
});

