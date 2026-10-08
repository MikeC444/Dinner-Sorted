import { router } from 'expo-router';
import { useState } from 'react';
import { DietCards, StepHeader } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { Button, H1, Muted } from '@/components/ui';
import { useApp } from '@/state/store';

export default function DietStep() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const [diet, setDiet] = useState(profile.diet);
  return (
    <Screen footer={<Button label="Continue" onPress={async () => { await updateProfile({ diet }); router.push('/onboarding/allergies'); }} />}>
      <StepHeader step={1} total={4} />
      <H1>How do you eat?</H1>
      <Muted>We'll only suggest dinners that suit you. You can change this any time in Account.</Muted>
      <DietCards value={diet} onChange={setDiet} />
    </Screen>
  );
}
