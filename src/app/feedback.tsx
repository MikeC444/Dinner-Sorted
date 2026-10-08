import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { BackLink } from '@/components/prefs';
import { Screen } from '@/components/Screen';
import { Body, Button, Chip, ChipWrap, H1, H3, Muted, Notice, Strong } from '@/components/ui';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/state/store';
import { colors, fonts } from '@/theme';

type Category = 'bug' | 'recipe' | 'allergen' | 'billing' | 'idea' | 'other';
const CATS: { value: Category; label: string; placeholder: string }[] = [
  { value: 'bug', label: "Something isn't working", placeholder: 'What were you doing, and what went wrong?' },
  { value: 'recipe', label: 'Problem with a recipe', placeholder: 'Which step or ingredient is wrong or unclear?' },
  { value: 'allergen', label: 'Wrong allergen or nutrition info', placeholder: 'Which recipe, and what looks wrong?' },
  { value: 'billing', label: 'Payments and subscription', placeholder: 'What happened with your payment or subscription?' },
  { value: 'idea', label: 'Suggestion or idea', placeholder: 'What would make Dinner Sorted better for you?' },
  { value: 'other', label: 'Something else', placeholder: 'Tell us more' },
];

export default function Feedback() {
  const params = useLocalSearchParams<{ category?: Category; context?: string; recipeId?: string }>();
  const session = useApp((s) => s.session);
  const showToast = useApp((s) => s.showToast);
  const [category, setCategory] = useState<Category | null>(params.category || null);
  const [message, setMessage] = useState('');
  const [device, setDevice] = useState(true);
  const [shot, setShot] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = !!category && message.trim().length >= 10;
  const placeholder = CATS.find((c) => c.value === category)?.placeholder || CATS[0].placeholder;

  const pick = async () => {
    if (shot) { setShot(null); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
    if (!res.canceled && res.assets[0]) setShot(res.assets[0]);
  };

  const send = async () => {
    if (!category) { showToast('Pick what your feedback is about'); return; }
    if (message.trim().length < 10) { showToast('Add a few more words so we can help'); return; }
    const uid = session?.user.id;
    if (!uid) return;
    setBusy(true);
    try {
      let screenshotPath: string | null = null;
      if (shot) {
        const path = `${uid}/${Date.now()}.jpg`;
        const bytes = await (await fetch(shot.uri)).arrayBuffer();
        const up = await supabase.storage.from('feedback-screenshots').upload(path, bytes, { contentType: shot.mimeType || 'image/jpeg' });
        if (!up.error) screenshotPath = path;
      }
      const context = [params.context, params.recipeId].filter(Boolean).join(' · ') || null;
      const { data, error } = await supabase.from('feedback').insert({
        user_id: uid, category, message: message.trim(), context, screenshot_path: screenshotPath,
        device: device ? {
          app: Application.nativeApplicationVersion, build: Application.nativeBuildVersion,
          os: Device.osName, osVersion: Device.osVersion, model: Device.modelName,
        } : null,
      }).select('reference').single();
      if (error) throw error;
      router.back();
      showToast(`Thanks, we've got it. Reference ${data.reference}`);
    } catch {
      Alert.alert("Couldn't send your feedback", env.supportEmail ? `Please try again, or email ${env.supportEmail}.` : 'Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <Screen footer={<Button label="Send feedback" disabled={!ready} loading={busy} onPress={send} />}>
      <BackLink onPress={() => router.back()} />
      <View style={{ gap: 6 }}>
        <H1>Help and feedback</H1>
        <Muted>Found a problem or have an idea? Tell us and we'll look into it.</Muted>
      </View>
      {params.context ? (
        <View style={st.context}><Muted style={{ fontFamily: fonts.bold }}>About</Muted><Strong>{params.context}</Strong></View>
      ) : null}
      <View style={{ gap: 10 }}>
        <H3>What's it about?</H3>
        <ChipWrap>{CATS.map((c) => <Chip key={c.value} label={c.label} selected={category === c.value} onPress={() => setCategory(c.value)} />)}</ChipWrap>
      </View>
      {category === 'allergen' ? <Notice tone="danger" icon="warning">If someone has had an allergic reaction, please get medical help first.</Notice> : null}
      <View style={{ gap: 8 }}>
        <H3>Tell us what happened</H3>
        <TextInput value={message} onChangeText={(t) => setMessage(t.slice(0, 2000))} placeholder={placeholder} placeholderTextColor={colors.muted}
          multiline textAlignVertical="top" accessibilityLabel="Your feedback" style={st.textarea} />
        <Muted style={{ alignSelf: 'flex-end', fontSize: 12 }}>{message.length} / 2000</Muted>
      </View>
      <Button label={shot ? 'Screenshot attached (tap to remove)' : 'Add a screenshot'} variant="outline" icon="camera" onPress={pick} style={{ alignSelf: 'flex-start' }} />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: device }} onPress={() => setDevice(!device)} style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[st.box, device && { backgroundColor: colors.accent, borderColor: colors.accent }]}>{device ? <Icon name="check" size={14} color={colors.white} strokeWidth={3.2} /> : null}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <Strong style={{ fontSize: 15 }}>Include app version and device details</Strong>
          <Muted>Helps us fix bugs faster. No personal data beyond your account.</Muted>
        </View>
      </Pressable>
      <Body style={{ fontSize: 13, color: colors.muted }}>
        We read every message. If we need more detail we'll reply to the email you signed in with.{env.supportEmail ? ` You can also email ${env.supportEmail}.` : ''}
      </Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  context: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: colors.soft },
  textarea: { minHeight: 140, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.chipLine, backgroundColor: colors.card,
    fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.ink },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.chipLine, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
