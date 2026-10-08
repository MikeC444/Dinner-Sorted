import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

/** A scrolling screen with an optional sticky bottom bar (for the main action). */
export function Screen({ children, footer, padded = true, edges = ['top'], contentStyle, scroll = true }: {
  children: ReactNode; footer?: ReactNode; padded?: boolean; edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>; scroll?: boolean;
}) {
  const body = scroll ? (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[padded && st.pad, st.gap, contentStyle]}>
      {children}
    </ScrollView>
  ) : <View style={[{ flex: 1 }, padded && st.pad, st.gap, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={st.root} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer ? <SafeAreaView edges={['bottom']} style={st.footer}>{footer}</SafeAreaView> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },
  gap: { gap: 18 },
  footer: { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 8 },
});

export function Section({ children, gap = 10 }: { children: ReactNode; gap?: number }) {
  return <View style={{ gap }}>{children}</View>;
}
