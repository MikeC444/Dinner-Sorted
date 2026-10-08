import { router } from 'expo-router';
import { useState } from 'react';
import { BackLink, StepHeader, TastesForm, tastesSummary } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { Button, H1, Muted } from '@/components/ui';
import { useApp } from '@/state/store';

export default function TastesStep() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const [tastes, setTastes] = useState(profile.tastes);
  return (
    <Screen footer={
      <>
        <Muted style={{ textAlign: 'center' }}>{tastesSummary(tastes)}</Muted>
        <Button label="Continue" onPress={async () => { await updateProfile({ tastes }); router.push('/onboarding/goal'); }} />
      </>
    }>
      <BackLink onPress={() => router.back()} />
      <StepHeader step={3} total={4} />
      <H1>What do you like to eat?</H1>
      <Muted>We'll suggest dinners built around what you pick. Change it any time in Account.</Muted>
      <TastesForm diet={profile.diet} value={tastes} onChange={setTastes} />
    </Screen>
  );
}
