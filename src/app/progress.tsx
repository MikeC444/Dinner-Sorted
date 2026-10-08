import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { BackLink } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { Body, Button, Card, Field, H1, H2, Muted } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/state/store';
import { colors } from '@/theme';

type Log = { logged_on: string; kg: number };

function Chart({ logs, target }: { logs: Log[]; target?: number }) {
  const W = 320, H = 140, P = 10;
  const values = logs.map((l) => Number(l.kg)).concat(target ? [target] : []);
  const min = Math.min(...values) - 1, max = Math.max(...values) + 1;
  const x = (i: number) => P + (logs.length <= 1 ? 0 : (i * (W - 2 * P)) / (logs.length - 1));
  const y = (v: number) => P + ((max - v) * (H - 2 * P)) / (max - min || 1);
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} accessibilityLabel="Weight trend chart">
      {target ? <Line x1={0} x2={W} y1={y(target)} y2={y(target)} stroke={colors.dashed} strokeDasharray="4 4" /> : null}
      <Polyline points={logs.map((l, i) => `${x(i)},${y(Number(l.kg))}`).join(' ')} fill="none" stroke={colors.accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {logs.map((l, i) => <Circle key={l.logged_on} cx={x(i)} cy={y(Number(l.kg))} r={4} fill={colors.accent} />)}
    </Svg>
  );
}

export default function Progress() {
  const goal = useApp((s) => s.profile.goal);
  const [logs, setLogs] = useState<Log[]>([]);
  const [kg, setKg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('weight_logs').select('logged_on,kg').order('logged_on', { ascending: true }).limit(104);
    setLogs((data || []) as Log[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const v = parseFloat(kg.replace(',', '.'));
    if (!(v >= 30 && v <= 400)) { Alert.alert('Check the number', 'Enter your weight in kg, for example 82.4'); return; }
    setBusy(true);
    const uid = useApp.getState().session?.user.id;
    const { error } = await supabase.from('weight_logs').upsert({ user_id: uid, logged_on: new Date().toISOString().slice(0, 10), kg: v }, { onConflict: 'user_id,logged_on' });
    setBusy(false);
    if (error) { Alert.alert("Couldn't save", 'Please try again.'); return; }
    setKg('');
    useApp.getState().showToast('Weight logged');
    load();
  };

  const first = logs[0], last = logs[logs.length - 1];
  const change = first && last ? Math.round((Number(last.kg) - Number(first.kg)) * 10) / 10 : 0;

  return (
    <Screen>
      <BackLink onPress={() => router.back()} />
      <H1>Progress</H1>
      <Muted>Log your weight once a week, at the same time of day, for the clearest trend.</Muted>
      <Card>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <Field label="Today's weight (kg)" value={kg} onChangeText={setKg} keyboardType="decimal-pad" />
          <Button label="Log" onPress={save} loading={busy} style={{ minHeight: 48 }} />
        </View>
      </Card>
      <Card>
        <H2>Trend</H2>
        {logs.length >= 2 ? (
          <>
            <Chart logs={logs} target={goal?.targetKg} />
            <Body>{change === 0 ? 'No change yet.' : change < 0 ? `Down ${Math.abs(change)} kg since ${new Date(first.logged_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.` : `Up ${change} kg since ${new Date(first.logged_on).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`}</Body>
            {goal ? <Muted>Dashed line: your target of {goal.targetKg} kg.</Muted> : null}
          </>
        ) : <Muted>Log at least two weigh-ins to see your trend.</Muted>}
      </Card>
    </Screen>
  );
}
