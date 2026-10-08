import { BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import type { Session } from '@supabase/supabase-js';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from '@/components/Toast';
import { envReady } from '@/lib/env';
import { startPurchases, stopPurchases } from '@/lib/purchases';
import { supabase } from '@/lib/supabase';
import { EMPTY_PROFILE, useApp } from '@/state/store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useAuthBootstrap() {
  const { setSession, setReady, loadUserData, reset, setPremium } = useApp.getState();
  useEffect(() => {
    if (!envReady) {
      // Demo mode (no Supabase keys): start signed in with a ready-made profile.
      useApp.setState({ session: { user: { id: 'demo' } } as Session, profile: { ...EMPTY_PROFILE, displayName: 'Demo cook', onboarded: true } });
      setReady(true);
      return;
    }
    let active = true;
    let loadedFor: string | null | undefined;
    const start = async (session: Session | null) => {
      const uid = session?.user.id ?? null;
      setSession(session);
      if (uid === loadedFor) return; // same person (e.g. token refresh)
      loadedFor = uid;
      setReady(false);
      if (session) {
        await loadUserData();
        // RevenueCat is the fast path for premium; the server's entitlements table is the source of truth.
        startPurchases(session.user.id, (p) => setPremium(p || useApp.getState().premium)).catch(() => {});
      } else {
        reset();
        stopPurchases().catch(() => {});
      }
      if (active) setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Run outside the auth callback, as supabase-js recommends, to avoid deadlocks.
      setTimeout(() => { start(session); }, 0);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
    Fraunces_600SemiBold, Fraunces_700Bold,
  });
  useAuthBootstrap();
  const ready = useApp((s) => s.ready);
  const session = useApp((s) => s.session);
  const onboarded = useApp((s) => s.profile.onboarded);

  useEffect(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  const signedIn = !!session;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth-callback" />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="cook/[id]" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="kitchen-results" />
          <Stack.Screen name="meal-plan" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="feedback" />
          <Stack.Screen name="edit-allergies" />
          <Stack.Screen name="edit-tastes" />
        </Stack.Protected>
      </Stack>
      <Toast />
    </SafeAreaProvider>
  );
}
