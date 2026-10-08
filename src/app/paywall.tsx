import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Body, Button, H1, IconButton, Muted, Strong } from '@/components/ui';
import { env } from '@/lib/env';
import { buy, loadPlans, restore, type PlanOption } from '@/lib/purchases';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

const BENEFITS = [
  ['The full recipe library', 'Thousands of dishes across every cuisine, including hundreds of vegan dinners, each with photos, steps and nutrition.'],
  ['Unlimited kitchen searches', 'Find dinners from what you have as often as you like.'],
  ['Weekly meal plans', 'Seven dinners matched to your calorie target and how you eat.'],
  ['Shopping list', 'Everything your plan needs, minus what is already in your kitchen.'],
  ['Progress tracking', 'Log your weight, see the trend and adjust as you go.'],
  ['Full nutrition and filters', 'Fibre, sugar, salt and more, plus high-protein and low-carb filters.'],
];

const COMPARE = [
  ['Recipe library', 'Starter selection', 'Thousands'],
  ['Kitchen searches', '3 a day', 'Unlimited'],
  ['Type in your own ingredients', 'Yes', 'Yes'],
  ['Step-by-step method', 'Yes', 'Yes'],
  ['Calories, protein, carbs, fat', 'Yes', 'Yes'],
  ['Allergy filtering', 'Yes', 'Yes'],
  ['Vegan and vegetarian', 'Yes', 'Yes'],
  ['Calorie target and BMI', 'Yes', 'Yes'],
  ['Fibre, sugar, salt, vitamins', 'No', 'Yes'],
  ['Weekly meal plans', 'No', 'Yes'],
  ['Shopping list', 'No', 'Yes'],
  ['Progress tracking', 'No', 'Yes'],
  ['High-protein and low-carb filters', 'No', 'Yes'],
  ['Cook mode timers', 'No', 'Yes'],
  ['Saved favourites', 'Up to 10', 'Unlimited'],
];

export default function Paywall() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const setPremium = useApp((s) => s.setPremium);
  const showToast = useApp((s) => s.showToast);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [chosen, setChosen] = useState<'annual' | 'monthly'>('annual');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadPlans().then(setPlans); }, []);
  const plan = plans.find((p) => p.id === chosen);

  const purchase = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      if (await buy(plan)) { setPremium(true); router.back(); showToast('Welcome to Premium'); }
    } catch (e: any) {
      Alert.alert('Purchase not completed', e?.message || 'Please try again.');
    } finally { setBusy(false); }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      if (await restore()) { setPremium(true); router.back(); showToast('Premium restored'); }
      else showToast('No previous purchases found');
    } catch { showToast("Couldn't restore purchases"); } finally { setBusy(false); }
  };

  const annual = plans.find((p) => p.id === 'annual');
  const cta = chosen === 'annual' && annual?.trial ? `Start ${annual.trial}` : `Subscribe for ${plan?.price ?? ''} ${plan?.period ?? ''}`;
  const sub = chosen === 'annual'
    ? `${annual?.trial ? 'Then ' : ''}${annual?.price ?? '£74.99'} a year. Cancel any time${annual?.trial ? ' before the trial ends and you won\'t be charged' : ''}.`
    : 'Billed monthly. Cancel any time.';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <SafeAreaView edges={['top']} style={st.hero}>
          <View style={{ alignSelf: 'flex-end' }}><IconButton icon="close" label="Close" onPress={() => router.back()} border={false} /></View>
          <Text style={st.badge}>Dinner Sorted Premium</Text>
          <H1 style={{ fontSize: 34, lineHeight: 35 }}>Every dinner sorted, all week</H1>
          {reason ? <Strong style={{ color: '#4A3A0A' }}>{reason}</Strong> : null}
        </SafeAreaView>
        <View style={{ padding: 20, gap: 18 }}>
          <View style={{ gap: 14 }}>
            {BENEFITS.map(([t, d]) => (
              <View key={t} style={{ flexDirection: 'row', gap: 12 }}>
                <View style={st.tick}><Icon name="check" size={16} color={colors.herbDark} strokeWidth={2.8} /></View>
                <View style={{ flex: 1, gap: 1 }}><Strong>{t}</Strong><Muted>{d}</Muted></View>
              </View>
            ))}
          </View>

          <View style={{ gap: 10 }} accessibilityRole="radiogroup">
            {plans.map((p) => {
              const on = p.id === chosen;
              return (
                <Pressable key={p.id} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setChosen(p.id)}
                  style={[st.plan, { borderColor: on ? colors.ink : colors.chipLine, backgroundColor: on ? colors.card : colors.bg }]}>
                  <View style={[st.radio, { borderColor: on ? colors.ink : colors.chipLine }]}>{on ? <View style={st.dot} /> : null}</View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Strong>{p.id === 'annual' ? 'Yearly' : 'Monthly'}</Strong>
                    <Muted>{p.id === 'annual' ? [p.trial, p.perMonth ? `works out at ${p.perMonth} a month` : null].filter(Boolean).join(' · ') : 'Cancel any time'}</Muted>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}><Text style={st.price}>{p.price}</Text><Muted style={{ fontSize: 12 }}>{p.period}</Muted></View>
                </Pressable>
              );
            })}
          </View>

          <View style={st.table}>
            <View style={[st.tr, { backgroundColor: colors.soft }]}>
              <Text style={[st.th, { flex: 1.6 }]}>Compare</Text><Text style={st.th}>Free</Text><Text style={st.th}>Premium</Text>
            </View>
            {COMPARE.map(([l, f, p]) => (
              <View key={l} style={st.tr}>
                <Text style={[st.td, { flex: 1.6, fontFamily: fonts.medium }]}>{l}</Text>
                <Text style={[st.td, { color: colors.muted }]}>{f}</Text>
                <Text style={[st.td, { color: colors.herbDark, fontFamily: fonts.bold }]}>{p}</Text>
              </View>
            ))}
          </View>

          <Muted style={{ textAlign: 'center', fontSize: 12 }}>
            Payment is taken by the App Store or Google Play and renews automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your store account settings.
          </Muted>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Button label="Restore purchases" variant="ghost" onPress={doRestore} />
            {env.termsUrl ? <Button label="Terms" variant="ghost" onPress={() => Linking.openURL(env.termsUrl)} /> : null}
            {env.privacyUrl ? <Button label="Privacy" variant="ghost" onPress={() => Linking.openURL(env.privacyUrl)} /> : null}
          </View>
        </View>
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={st.footer}>
        <Button label={cta} variant="dark" loading={busy} disabled={!plan} onPress={purchase} />
        <Body style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>{sub}</Body>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: colors.goldTint, paddingHorizontal: 20, paddingBottom: 22, gap: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.gold, color: colors.goldInk, fontFamily: fonts.bold, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.herbTint, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  price: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  table: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  tr: { flexDirection: 'row', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: colors.soft },
  th: { flex: 1, fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  td: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  footer: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 6 },
});
