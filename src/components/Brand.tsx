import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme';

/** The Dinner Sorted mark: a serving dome with a tick ("dinner, sorted"). */
export function LogoMark({ size = 44, background = colors.card }: { size?: number; background?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Dinner Sorted logo">
      <Rect x={0.5} y={0.5} width={119} height={119} rx={26.5} fill={background} stroke="#E5DACB" />
      <Circle cx={60} cy={34} r={6} fill={colors.accent} />
      <Path d="M24 78a36 36 0 0 1 72 0z" fill={colors.accent} />
      <Rect x={18} y={80} width={84} height={8} rx={4} fill={colors.ink} />
      <Path d="M50 63l7 7 14-15" fill="none" stroke={background} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <Text accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: size, letterSpacing: -size * 0.03, color: colors.ink }}>
      Dinner <Text style={{ color: colors.accent }}>Sorted</Text>
    </Text>
  );
}

export function Lockup({ size = 44 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <Wordmark size={Math.round(size * 0.55)} />
    </View>
  );
}

/** Decorative plate shown when a dish has no photo. */
export function PlateArt({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={colors.white} strokeWidth={1.2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9.6} fill="rgba(255,255,255,0.16)" stroke="none" />
      <Circle cx={12} cy={12} r={6.6} fill="rgba(255,255,255,0.30)" stroke="none" />
      <Path d="M8.8 10.6c.9-1.4 2.4-1.4 3 .1 M13.3 13.2c.9-1 2-.6 2.4.5 M9.6 14.6c.8-.5 1.7-.1 1.9.8" />
    </Svg>
  );
}
