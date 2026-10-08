// Small shared building blocks: text styles, buttons, chips, segmented controls, cards, badges.

import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Icon, type IconName } from './Icon';

// ---------- Text ----------

type TP = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };

export const H1 = ({ children, style }: TP) => <Text accessibilityRole="header" style={[t.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: TP) => <Text accessibilityRole="header" style={[t.h2, style]}>{children}</Text>;
export const H3 = ({ children, style }: TP) => <Text accessibilityRole="header" style={[t.h3, style]}>{children}</Text>;
export const Body = ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[t.body, style]}>{children}</Text>;
export const Muted = ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[t.muted, style]}>{children}</Text>;
export const Eyebrow = ({ children, style }: TP) => <Text style={[t.eyebrow, style]}>{children}</Text>;
export const Strong = ({ children, style, numberOfLines }: TP) => <Text numberOfLines={numberOfLines} style={[t.strong, style]}>{children}</Text>;

const t = StyleSheet.create({
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, letterSpacing: -0.9, color: colors.ink },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 25, letterSpacing: -0.4, color: colors.ink },
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  muted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.muted },
  strong: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },
});

// ---------- Buttons ----------

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'gold';

export function Button({ label, onPress, variant = 'primary', disabled, loading, icon, style, accessibilityLabel }: {
  label: string; onPress?: () => void; variant?: Variant; disabled?: boolean; loading?: boolean; icon?: IconName;
  style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const v = VARIANTS[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [b.base, { backgroundColor: off && variant !== 'ghost' ? colors.disabled : v.bg, borderColor: v.border },
        variant === 'ghost' && b.ghost, pressed && !off && { opacity: 0.85 }, style]}>
      {loading ? <ActivityIndicator color={v.fg} /> : (
        <View style={b.row}>
          {icon ? <Icon name={icon} size={18} color={off && variant !== 'ghost' ? colors.body : v.fg} /> : null}
          <Text style={[b.label, { color: off && variant !== 'ghost' ? colors.body : v.fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, fg: colors.white, border: colors.accent },
  dark: { bg: colors.dark, fg: colors.white, border: colors.dark },
  outline: { bg: colors.card, fg: colors.ink, border: colors.chipLine },
  ghost: { bg: 'transparent', fg: colors.accentDark, border: 'transparent' },
  gold: { bg: colors.goldTint, fg: colors.goldInk, border: colors.goldLine },
};

const b = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  ghost: { minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 16 },
});

export function IconButton({ icon, onPress, label, color = colors.ink, bg = colors.card, border = true }: {
  icon: IconName; onPress: () => void; label: string; color?: string; bg?: string; border?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => [ib.btn, { backgroundColor: bg, borderWidth: border ? 1.5 : 0 }, pressed && { opacity: 0.8 }]}>
      <Icon name={icon} color={color} size={20} />
    </Pressable>
  );
}
const ib = StyleSheet.create({ btn: { width: 44, height: 44, borderRadius: 22, borderColor: colors.chipLine, alignItems: 'center', justifyContent: 'center' } });

// ---------- Chips ----------

type ChipTone = 'accent' | 'soft' | 'danger' | 'herb';

export function Chip({ label, selected, onPress, tone = 'accent', icon, accessibilityLabel }: {
  label: string; selected?: boolean; onPress?: () => void; tone?: ChipTone; icon?: IconName; accessibilityLabel?: string;
}) {
  const on = CHIP_ON[tone];
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      style={({ pressed }) => [c.chip, selected ? { backgroundColor: on.bg, borderColor: on.border } : null, pressed && { opacity: 0.85 }]}>
      {icon ? <Icon name={icon} size={14} strokeWidth={2.8} color={selected ? on.fg : colors.ink} /> : null}
      <Text style={[c.label, { color: selected ? on.fg : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}
const CHIP_ON: Record<ChipTone, { bg: string; fg: string; border: string }> = {
  accent: { bg: colors.accent, fg: colors.white, border: colors.accent },
  soft: { bg: colors.accentTint, fg: colors.accentDark, border: colors.accent },
  danger: { bg: colors.dangerTint, fg: colors.danger, border: colors.danger },
  herb: { bg: colors.herbTint, fg: colors.herbDark, border: colors.herb },
};
const c = StyleSheet.create({
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.chipLine,
    backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: fonts.medium, fontSize: 14 },
});

export const ChipWrap = ({ children }: { children: ReactNode }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;

// ---------- Segmented ----------

export function Segmented<T extends string | number>({ options, value, onChange, small }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; small?: boolean;
}) {
  return (
    <View style={s.wrap} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.value)}
            style={[s.item, on && s.on]}>
            <Text style={[s.label, small && { fontSize: 12 }, { color: on ? colors.ink : colors.body }]} numberOfLines={2}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.segment },
  item: { flex: 1, minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  on: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  label: { fontFamily: fonts.bold, fontSize: 14, textAlign: 'center' },
});

// ---------- Cards, badges, fields ----------

export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 10 }, style]}>{children}</View>
);

export function PremiumBadge({ small }: { small?: boolean }) {
  return (
    <View style={[bd.badge, { backgroundColor: colors.gold }, small && bd.small]}>
      <Icon name="lock" size={small ? 10 : 12} color={colors.goldInk} strokeWidth={2.6} />
      <Text style={[bd.text, { color: colors.goldInk }]}>Premium</Text>
    </View>
  );
}

export function DietTag({ vegan, vegetarian }: { vegan?: boolean; vegetarian?: boolean }) {
  if (!vegan && !vegetarian) return null;
  return (
    <View style={[bd.badge, bd.small, { backgroundColor: vegan ? colors.herbTint : colors.soft }]}>
      <Text style={[bd.text, { color: vegan ? colors.herbDark : colors.body }]}>{vegan ? 'Vegan' : 'Veggie'}</Text>
    </View>
  );
}

const bd = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: 8, borderRadius: 999, alignSelf: 'flex-start' },
  small: { height: 20, paddingHorizontal: 7 },
  text: { fontFamily: fonts.bold, fontSize: 11 },
});

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} accessibilityLabel={label} {...props} style={[f.input, props.style]} />
      {hint ? <Text style={f.hint}>{hint}</Text> : null}
    </View>
  );
}
const f = StyleSheet.create({
  label: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  input: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.chipLine, backgroundColor: colors.card,
    fontFamily: fonts.body, fontSize: 17, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});

export function Notice({ tone = 'gold', icon, children }: { tone?: 'gold' | 'danger' | 'soft' | 'herb'; icon?: IconName; children: ReactNode }) {
  const map = {
    gold: [colors.goldTint, '#4A3A0A'], danger: [colors.dangerTint, '#5E1F12'], soft: [colors.soft, colors.body], herb: [colors.herbTint, colors.herbDark],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, backgroundColor: bg }}>
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: fg }}>{children}</Text>
    </View>
  );
}

export function RowLink({ title, subtitle, onPress, icon }: { title: string; subtitle?: string; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
      style={({ pressed }) => [rl.row, pressed && { opacity: 0.85 }]}>
      {icon ? <View style={rl.icon}><Icon name={icon} size={20} color={colors.accentDark} /></View> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Strong>{title}</Strong>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </View>
      <Icon name="chevron" size={20} color={colors.muted} />
    </Pressable>
  );
}
const rl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
});
