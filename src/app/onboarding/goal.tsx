import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { BackLink, StepHeader } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { H1, Muted } from '@/components/ui';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

const OPTIONS = [
  { id: 'lose', label: 'Lose weight', sub: 'A calorie target and dinners that fit it', to: '/goals' as const },
  { id: 'healthier', label: 'Eat a bit healthier', sub: 'Balanced dinners with clear nutrition', to: '/tonight' as const },
  { id: 'ideas', label: 'Just need dinner ideas', sub: 'Quick inspiration from what you have', to: '/tonight' as const },
];

export default function GoalStep() {
  const updateProfile = useApp((s) => s.updateProfile);
  const finish = async (to: '/goals' | '/tonight') => {
    await updateProfile({ onboarded: true });
    router.replace(to);
  };
  return (
    <Screen>
      <BackLink onPress={() => router.back()} />
      <StepHeader step={4} total={4} />
      <H1>What brings you here?</H1>
      <View style={{ gap: 10 }}>
        {OPTIONS.map((o) => (
          <Pressable key={o.id} accessibilityRole="button" onPress={() => finish(o.to)}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 16, borderWidth: 1.5,
              borderColor: colors.line, backgroundColor: colors.card }, pressed && { opacity: 0.85 }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: colors.ink }}>{o.label}</Text>
              <Muted>{o.sub}</Muted>
            </View>
            <Icon name="chevron" color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
