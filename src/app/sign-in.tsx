import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Lockup } from '@/components/Brand';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { Body, Button, Field, H1, Muted } from '@/components/ui';
import { sendEmailCode, signInWithApple, signInWithGoogle, verifyEmailCode } from '@/lib/auth';
import { env } from '@/lib/env';
import { colors, fonts } from '@/theme';

function Plates() {
  const plate = (bg: string, size: number, ml: number) => (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: 4, borderColor: colors.bg, marginLeft: ml,
      alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size * 0.64} height={size * 0.64} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.1} strokeLinecap="round">
        <Circle cx={12} cy={12} r={9.6} fill="rgba(255,255,255,0.16)" stroke="none" />
        <Circle cx={12} cy={12} r={6.6} fill="rgba(255,255,255,0.30)" stroke="none" />
        <Path d="M8.8 10.6c.9-1.4 2.4-1.4 3 .1 M13.3 13.2c.9-1 2-.6 2.4.5 M9.6 14.6c.8-.5 1.7-.1 1.9.8" />
      </Svg>
    </View>
  );
  return <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityElementsHidden>{plate('#A4472A', 92, 0)}{plate('#4E7A3A', 100, -20)}{plate('#2F5D74', 84, -18)}</View>;
}

export default function SignIn() {
  const [mode, setMode] = useState<'choose' | 'email' | 'code'>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch (e: any) { Alert.alert("Couldn't sign you in", e?.message || 'Please try again.'); } finally { setBusy(false); }
  };

  if (mode !== 'choose') {
    return (
      <Screen footer={
        mode === 'email'
          ? <Button label="Send me a code" loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)} onPress={() => run(async () => { await sendEmailCode(email); setMode('code'); })} />
          : <Button label="Sign in" loading={busy} disabled={code.trim().length < 6} onPress={() => run(() => verifyEmailCode(email, code))} />
      }>
        <Button label="Back" variant="ghost" icon="back" onPress={() => setMode(mode === 'code' ? 'email' : 'choose')} style={{ alignSelf: 'flex-start' }} />
        <H1>{mode === 'email' ? 'Sign in with email' : 'Check your email'}</H1>
        {mode === 'email' ? (
          <>
            <Muted>We'll email you a 6-digit code. No password needed.</Muted>
            <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          </>
        ) : (
          <>
            <Muted>We sent a code to {email}. It can take a minute to arrive.</Muted>
            <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={8} />
          </>
        )}
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ paddingTop: 28, gap: 22 }}>
      <Lockup size={44} />
      <Plates />
      <H1 style={{ fontSize: 42, lineHeight: 42 }}>What's for dinner? Sorted.</H1>
      <Body style={{ color: colors.muted, fontSize: 17, lineHeight: 24 }}>
        Ideas from what's already in your kitchen, recipes from around the world, and meals that fit your goals.
      </Body>
      <View style={{ gap: 10 }}>
        {['Tell us what\'s in the fridge, get dinner ideas', 'Step-by-step recipes with calories', 'Vegan, vegetarian and allergy-friendly'].map((t) => (
          <View key={t} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name="check" color={colors.accent} size={20} strokeWidth={2.4} /><Body>{t}</Body>
          </View>
        ))}
      </View>
      <View style={{ gap: 12, marginTop: 6 }}>
        {Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14} style={{ height: 54 }} onPress={() => run(signInWithApple)} />
        ) : null}
        <Button label="Continue with Google" variant="outline" loading={busy} onPress={() => run(signInWithGoogle)} />
        <Button label="Sign up with email" variant="ghost" onPress={() => setMode('email')} />
        <Text style={st.legal}>
          By continuing you agree to our{' '}
          <Text style={st.link} onPress={() => env.termsUrl && Linking.openURL(env.termsUrl)}>Terms</Text> and{' '}
          <Text style={st.link} onPress={() => env.privacyUrl && Linking.openURL(env.privacyUrl)}>Privacy Policy</Text>. Free to use, Premium is optional.
        </Text>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  legal: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' },
  link: { color: colors.accentDark, textDecorationLine: 'underline' },
});
