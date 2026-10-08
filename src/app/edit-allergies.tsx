import { router } from 'expo-router';
import { useState } from 'react';
import { AllergyForm, BackLink, allergySummary, type AllergyValue } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { Button, H1, Muted } from '@/components/ui';
import { useApp } from '@/state/store';

export default function EditAllergies() {
  const profile = useApp((s) => s.profile);
  const { updateProfile, showToast } = useApp.getState();
  const [value, setValue] = useState<AllergyValue>({
    allergies: profile.allergies, allergyOther: profile.allergyOther, none: !profile.allergies.length && !profile.allergyOther.length,
  });
  return (
    <Screen footer={
      <>
        <Muted style={{ textAlign: 'center' }}>{allergySummary(value)}</Muted>
        <Button label="Save allergies" onPress={async () => {
          await updateProfile({ allergies: value.allergies, allergyOther: value.allergyOther });
          router.back();
          showToast('Allergies saved. Suggestions updated.');
        }} />
      </>
    }>
      <BackLink onPress={() => router.back()} />
      <H1>Allergies and intolerances</H1>
      <Muted>Recipes containing these are hidden everywhere in the app. Include anyone you cook for.</Muted>
      <AllergyForm value={value} onChange={setValue} />
    </Screen>
  );
}
