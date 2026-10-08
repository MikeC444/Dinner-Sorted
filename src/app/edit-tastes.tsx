import { router } from 'expo-router';
import { useState } from 'react';
import { BackLink, TastesForm, tastesSummary } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { Button, H1, Muted } from '@/components/ui';
import { useApp } from '@/state/store';

export default function EditTastes() {
  const profile = useApp((s) => s.profile);
  const { updateProfile, showToast } = useApp.getState();
  const [tastes, setTastes] = useState(profile.tastes);
  return (
    <Screen footer={
      <>
        <Muted style={{ textAlign: 'center' }}>{tastesSummary(tastes)}</Muted>
        <Button label="Save preferences" onPress={async () => { await updateProfile({ tastes }); router.back(); showToast('Preferences saved. Suggestions updated.'); }} />
      </>
    }>
      <BackLink onPress={() => router.back()} />
      <H1>What do you like to eat?</H1>
      <Muted>We'll suggest dinners built around what you pick.</Muted>
      <TastesForm diet={profile.diet} value={tastes} onChange={setTastes} />
    </Screen>
  );
}
