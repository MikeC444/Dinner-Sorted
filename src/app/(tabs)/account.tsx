import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { DietSegmented, allergySummary, tastesSummary } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { Button, Card, H1, H2, Muted, RowLink } from '@/components/ui';
import { deleteAccount } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { env } from '@/lib/env';
import { manageSubscription } from '@/lib/purchases';
import { openPaywall } from '@/lib/open';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

export default function Account() {
  const session = useApp((s) => s.session);
  const profile = useApp((s) => s.profile);
  const premium = useApp((s) => s.premium);
  const updateProfile = useApp((s) => s.updateProfile);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, preferences, kitchen, favourites and weight details. If you have Premium, cancel it in your App Store or Google Play settings first, as deleting your account does not stop store billing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try { await deleteAccount(); await signOut(); } catch { Alert.alert("Couldn't delete your account", 'Please try again, or contact support.'); } finally { setDeleting(false); }
        } },
      ],
    );
  };

  return (
    <Screen>
      <H1>Account</H1>
      <Card>
        <H2 style={{ fontSize: 18 }}>Signed in</H2>
        <Muted>{session?.user.email || 'Your account'} · Your goal, kitchen and favourites sync across devices.</Muted>
      </Card>

      <Card>
        <H2 style={{ fontSize: 18 }}>How you eat</H2>
        <DietSegmented value={profile.diet} onChange={(diet) => updateProfile({ diet })} />
        <Muted>Applies to suggestions, kitchen matches, meal plans and the ingredient list.</Muted>
      </Card>

      <RowLink title="Allergies and intolerances" subtitle={allergySummary(profile)} onPress={() => router.push('/edit-allergies')} />
      <RowLink title="Food preferences" subtitle={tastesSummary(profile.tastes)} onPress={() => router.push('/edit-tastes')} />

      <Card>
        <Muted style={{ fontFamily: fonts.bold }}>Your plan</Muted>
        <H2 style={{ fontSize: 24 }}>{premium ? 'Premium' : 'Free'}</H2>
        <Muted>{premium ? 'Manage or cancel any time in your App Store or Google Play settings.' : 'Starter recipes, 3 kitchen searches a day and your calorie target. Premium is £6.99 a month or £74.99 a year.'}</Muted>
        <Button label={premium ? 'Manage subscription' : 'See Premium'} variant="dark"
          onPress={() => (premium ? manageSubscription().catch(() => {}) : openPaywall(''))} />
      </Card>

      <RowLink icon="chat" title="Help and feedback" subtitle="Report a problem or suggest an idea" onPress={() => router.push('/feedback')} />

      <View style={{ gap: 4 }}>
        {env.privacyUrl ? <Button label="Privacy policy" variant="ghost" onPress={() => Linking.openURL(env.privacyUrl)} /> : null}
        {env.termsUrl ? <Button label="Terms of use" variant="ghost" onPress={() => Linking.openURL(env.termsUrl)} /> : null}
        <Button label="Sign out" variant="ghost" onPress={() => signOut()} />
        <Button label="Delete account" variant="ghost" loading={deleting} onPress={confirmDelete} style={{ borderColor: 'transparent' }} />
      </View>
      <Muted style={{ textAlign: 'center', color: colors.muted }}>Dinner Sorted</Muted>
    </Screen>
  );
}
