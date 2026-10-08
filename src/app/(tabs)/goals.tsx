import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { RecipeRow } from '@/components/RecipeCards';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, Field, H1, H2, Muted, Notice, PremiumBadge, Segmented } from '@/components/ui';
import { api, type RecipeCard } from '@/lib/api';
import { pantryTerms } from '@/lib/ingredients';
import { calcGoal, checkGoal, cmToFtIn, kgToStLb, type Activity, type Goal, type Pace, type Sex } from '@/lib/nutrition';
import { openPaywall, openRecipe } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

const num = (s: string) => { const n = parseFloat(s.replace(',', '.')); return isFinite(n) ? n : NaN; };

export default function Goals() {
  const profile = useApp((s) => s.profile);
  const premium = useApp((s) => s.premium);
  const pantry = useApp((s) => s.pantry);
  const { updateProfile, showToast } = useApp.getState();
  const g0 = profile.goal;
  const [sex, setSex] = useState<Sex>(g0?.sex || 'f');
  const [age, setAge] = useState(g0 ? String(g0.age) : '');
  const [height, setHeight] = useState(g0 ? String(g0.heightCm) : '');
  const [weight, setWeight] = useState(g0 ? String(g0.weightKg) : '');
  const [target, setTarget] = useState(g0 ? String(g0.targetKg) : '');
  const [activity, setActivity] = useState<Activity>(g0?.activity || 'light');
  const [pace, setPace] = useState<Pace>(g0?.pace || 0.5);
  const [consent, setConsent] = useState(Boolean(profile.healthConsentAt));
  const [fits, setFits] = useState<RecipeCard[] | null>(null);

  const draft: Partial<Goal> = { sex, age: num(age), heightCm: num(height), weightKg: num(weight), targetKg: num(target), activity, pace };
  const check = checkGoal(draft);
  const result = check.ok ? calcGoal(draft as Goal) : null;
  const budget = result?.dinnerKcal;

  useEffect(() => {
    if (!budget) { setFits(null); return; }
    let live = true;
    api.suggest(pantryTerms(pantry))
      .then((r) => { if (live) setFits(r.recipes.filter((x) => x.nutrition?.kcal && x.nutrition.kcal <= budget).slice(0, 3)); })
      .catch(() => live && setFits([]));
    return () => { live = false; };
  }, [budget, profile.diet, profile.allergies, profile.tastes]);

  const save = async () => {
    if (!result) return;
    if (!consent) { showToast('Tick the box to let us store your details'); return; }
    await updateProfile({ goal: draft as Goal, healthConsentAt: profile.healthConsentAt || new Date().toISOString() });
    showToast('Goal saved. Your dinner budget is on the Tonight screen.');
  };

  const headline = useMemo(() => {
    if (!result) return '';
    const diff = Math.abs(num(target) - num(weight));
    const d = Math.round(diff * 10) / 10;
    return result.mode === 'lose' ? `To lose ${d} kg, aim for` : result.mode === 'gain' ? `To gain ${d} kg, aim for` : `To stay at ${num(weight)} kg, aim for`;
  }, [result, target, weight]);

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <H1>Your goal</H1>
        <Muted>Enter your details for a daily calorie target. Dinners are matched to it.</Muted>
      </View>

      <Card style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={st.label}>Sex (used in the calorie maths)</Text>
          <Segmented<Sex> options={[{ value: 'f', label: 'Female' }, { value: 'm', label: 'Male' }]} value={sex} onChange={setSex} />
        </View>
        <View style={st.grid}>
          <Field label="Age" value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
          <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" hint={cmToFtIn(num(height)) || ' '} />
        </View>
        <View style={st.grid}>
          <Field label="Current weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" hint={kgToStLb(num(weight)) || ' '} />
          <Field label="Target weight (kg)" value={target} onChangeText={setTarget} keyboardType="decimal-pad" hint={kgToStLb(num(target)) || ' '} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={st.label}>How active are you day to day?</Text>
          <Segmented<Activity> small options={[{ value: 'low', label: 'Mostly sitting' }, { value: 'light', label: 'On my feet' }, { value: 'active', label: 'Very active' }]}
            value={activity} onChange={setActivity} />
        </View>
        {!result || result.mode !== 'maintain' ? (
          <View style={{ gap: 6 }}>
            <Text style={st.label}>Pace</Text>
            <Segmented<Pace> small options={[{ value: 0.25, label: 'Gentle\n0.25 kg/wk' }, { value: 0.5, label: 'Steady\n0.5 kg/wk' }, { value: 0.75, label: 'Faster\n0.75 kg/wk' }]}
              value={pace} onChange={setPace} />
          </View>
        ) : null}
      </Card>

      {!check.ok && check.reason === 'minor' ? <Notice tone="danger">The weight tools are for adults. Recipes and kitchen search still work as normal.</Notice> : null}
      {!check.ok && check.reason === 'out_of_range' ? <Notice tone="soft">Those numbers look out of range. Please check them.</Notice> : null}

      {result ? (
        <>
          <View style={st.result}>
            <Text style={st.resultSmall}>{headline}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={st.big}>{result.dailyKcal.toLocaleString('en-GB')}</Text>
              <Text style={st.resultText}>kcal a day</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Stat label="Dinner budget" value={String(result.dinnerKcal)} />
              <Stat label="BMI now" value={result.bmi.toFixed(1)} />
              <Stat label="Target BMI" value={result.targetBmi.toFixed(1)} />
            </View>
            <Text style={st.resultSmall}>
              {result.reachDate
                ? `At this pace you could reach ${num(target)} kg around ${result.reachDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (about ${result.weeks} weeks).`
                : result.mode === 'maintain' ? 'This keeps your weight roughly where it is.' : 'Your target is close to your daily needs, so progress would be very slow.'}
            </Text>
          </View>
          {result.lowestHealthyKg ? (
            <Notice tone="danger" icon="warning">This target is below the healthy weight range for your height. The lowest healthy weight for you is about {result.lowestHealthyKg} kg.</Notice>
          ) : null}
          {result.floorApplied ? (
            <Notice tone="gold">We don't go below {result.floorKcal.toLocaleString('en-GB')} kcal a day, so your pace is a little slower than you picked.</Notice>
          ) : null}

          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(!consent)} style={st.consent}>
            <View style={[st.box, consent && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
              {consent ? <Icon name="check" size={14} color={colors.white} strokeWidth={3.2} /> : null}
            </View>
            <Body style={{ flex: 1, fontSize: 14 }}>I agree to Dinner Sorted storing my height, weight and goal to work out my targets. I can delete them any time.</Body>
          </Pressable>
          <Button label={profile.goal ? 'Update my goal' : 'Save my goal'} onPress={save} />

          <View style={{ gap: 10 }}>
            <H2>Dinners within {result.dinnerKcal} kcal</H2>
            {fits === null ? <Muted>Finding dinners…</Muted> : fits.length === 0 ? <Muted>No matches right now. Try Browse with "Under 500 kcal".</Muted> : null}
            {fits?.map((r) => <RecipeRow key={r.id} recipe={r} onPress={() => openRecipe(r)} />)}
          </View>

          <Teaser title="Your week" body={`Seven dinners built around ${result.dailyKcal.toLocaleString('en-GB')} kcal, plus a shopping list.`}
            cta={premium ? 'Plan my week' : 'Unlock meal plans'} premium={premium}
            onPress={() => (premium ? router.push({ pathname: '/meal-plan', params: { budget: String(result.dinnerKcal) } }) : openPaywall('Get a weekly dinner plan built around your calorie target.'))} />
          <Teaser title="Progress" body="Log your weight each week and watch the trend."
            cta={premium ? 'Open progress' : 'Unlock progress tracking'} premium={premium}
            onPress={() => (premium ? router.push('/progress') : openPaywall('Track your weight and watch the trend.'))} />
        </>
      ) : null}

      <Muted style={{ fontSize: 12 }}>
        Estimates use the Mifflin-St Jeor formula and are a starting point, not medical advice. If you're pregnant, have a health condition or take medication that affects weight, check with your GP first.
      </Muted>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, padding: 10, borderRadius: 12, backgroundColor: colors.darkTile, gap: 2 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.white }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.white }}>{value}</Text>
    </View>
  );
}

function Teaser({ title, body, cta, premium, onPress }: { title: string; body: string; cta: string; premium: boolean; onPress: () => void }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <H2>{title}</H2>
        {!premium ? <PremiumBadge small /> : null}
      </View>
      <Body>{body}</Body>
      <Button label={cta} variant={premium ? 'primary' : 'dark'} onPress={onPress} />
    </Card>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  grid: { flexDirection: 'row', gap: 12 },
  result: { backgroundColor: colors.dark, borderRadius: 20, padding: 20, gap: 14 },
  resultSmall: { fontFamily: fonts.medium, fontSize: 14, color: colors.white, lineHeight: 20 },
  resultText: { fontFamily: fonts.body, fontSize: 16, color: colors.white },
  big: { fontFamily: fonts.display, fontSize: 46, color: colors.white, letterSpacing: -1.2 },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.chipLine, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});

