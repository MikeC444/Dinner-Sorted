import { Redirect } from 'expo-router';
import { useApp } from '@/state/store';

/** Entry point: sends people to sign-in, onboarding or the app. */
export default function Index() {
  const session = useApp((s) => s.session);
  const onboarded = useApp((s) => s.profile.onboarded);
  if (!session) return <Redirect href="/sign-in" />;
  if (!onboarded) return <Redirect href="/onboarding/diet" />;
  return <Redirect href="/tonight" />;
}
