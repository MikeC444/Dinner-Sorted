import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton, Muted } from '@/components/ui';
import { openPaywall } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

/** Finds a cooking time in a step, e.g. "simmer for 15 minutes" -> 15. */
function minutesIn(step: string): number | null {
  const m = step.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*(?:min|minute)/i);
  if (!m) return null;
  return Number(m[2] || m[1]);
}

export default function CookMode() {
  const params = useLocalSearchParams<{ id: string; title: string; steps: string }>();
  const steps: string[] = useMemo(() => { try { return JSON.parse(params.steps || '[]'); } catch { return []; } }, [params.steps]);
  const premium = useApp((s) => s.premium);
  const [i, setI] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => { if (timer.current) clearInterval(timer.current); setRemaining(null); }, [i]);

  const step = steps[i] || '';
  const mins = minutesIn(step);
  const last = i >= steps.length - 1;

  const startTimer = () => {
    if (!mins) return;
    if (timer.current) clearInterval(timer.current);
    setRemaining(mins * 60);
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r === null) return null;
        if (r <= 1) {
          if (timer.current) clearInterval(timer.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.card }}>
      <View style={{ flex: 1, padding: 20, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconButton icon="close" label="Close cook mode" onPress={() => router.back()} />
          <Muted numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bold }}>{params.title}</Muted>
        </View>
        <View style={st.track}><View style={{ height: 8, width: `${Math.round((100 * (i + 1)) / Math.max(1, steps.length))}%`, backgroundColor: colors.accent }} /></View>
        <Text style={st.stepLabel}>Step {i + 1} of {steps.length}</Text>
        <Text style={st.stepText} accessibilityLiveRegion="polite">{step}</Text>
        {mins ? (
          premium ? (
            remaining !== null ? (
              <View style={st.timer}><Text style={st.timerText}>{remaining === 0 ? 'Time!' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}</Text></View>
            ) : <Button label={`Start ${mins} min timer`} variant="outline" icon="clock" onPress={startTimer} style={{ alignSelf: 'flex-start' }} />
          ) : (
            <Button label={`${mins} min timer with Premium`} variant="gold" icon="lock" style={{ alignSelf: 'flex-start' }}
              onPress={() => openPaywall('Cook mode timers count down each step for you.')} />
          )
        ) : null}
        <View style={{ marginTop: 'auto', flexDirection: 'row', gap: 10 }}>
          {i > 0 ? <Button label="Back" variant="outline" style={{ flex: 1 }} onPress={() => setI(i - 1)} /> : null}
          <Button label={last ? 'Finish' : 'Next step'} style={{ flex: 2 }}
            onPress={() => { if (last) { router.back(); useApp.getState().showToast('Enjoy your dinner'); } else setI(i + 1); }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: colors.track, overflow: 'hidden' },
  stepLabel: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.herbDark },
  stepText: { fontFamily: fonts.displaySemi, fontSize: 27, lineHeight: 35, color: colors.ink },
  timer: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.herbTint },
  timerText: { fontFamily: fonts.display, fontSize: 32, color: colors.herbDark },
});
