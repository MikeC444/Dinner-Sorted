import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/store';
import { colors, fonts } from '../theme';

export function Toast() {
  const toast = useApp((s) => s.toast);
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={[st.wrap, { bottom: insets.bottom + 90 }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <Text style={st.text}>{toast}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 20, right: 20, padding: 14, borderRadius: 14, backgroundColor: colors.dark },
  text: { color: colors.white, fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' },
});
