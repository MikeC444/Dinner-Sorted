import { router } from 'expo-router';
import { useState } from 'react';
import { AllergyForm, BackLink, StepHeader, allergySummary, type AllergyValue } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { Button, H1, Muted } from '@/components/ui';
import { useApp } from '@/state/store';

export default function AllergiesStep() {
  const profile = useApp((s) => s.profile);
  const updateProfile = useApp((s) => s.updateProfile);
  const [value, setValue] = useState<AllergyValue>({ allergies: profile.allergies, allergyOther: profile.allergyOther, none: false });
  const answered = value.none || value.allergies.length > 0 || value.allergyOther.length > 0;
  return (
    <Screen footer={
      <>
        <Muted style={{ textAlign: 'center' }}>{answered ? allergySummary(value) : 'Choose any that apply, or "No allergies"'}</Muted>
        <Button label="Continue" disabled={!answered} onPress={async () => {
          await updateProfile({ allergies: value.allergies, allergyOther: value.allergyOther });
          router.push('/onboarding/tastes');
        }} />
      </>
    }>
      <BackLink onPress={() => router.back()} />
      <StepHeader step={2} total={4} />
      <H1>Any food allergies or intolerances?</H1>
      <Muted>Recipes containing these are hidden everywhere in the app. Include anyone you cook for.</Muted>
      <AllergyForm value={value} onChange={setValue} />
    </Screen>
  );
}
