// Building blocks for the Tonight (home) screen.

import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../theme';
import { Icon } from './Icon';

/** A whisk with a few "sparkle" lines, drawn as vectors. */
export function WhiskMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={colors.gold} strokeWidth={2.4} strokeLinecap="round" accessibilityElementsHidden>
      <Path d="M30 6l-8 14" stroke={colors.accent} />
      <Path d="M22 20c-5 1-9 5-10 10 3 0 6-1 8-3 M22 20c-3 4-4 9-2 14 2-3 3-6 3-10 M22 20c3 2 6 6 6 10-3 0-5-2-6-4" stroke={colors.accent} />
      <Path d="M10 22l-4-2 M12 14l-3-3 M20 8l-1-5 M38 14l4-2 M40 24l4 1" />
    </Svg>
  );
}

/** Initials in a circle; opens Account. (We don't have profile photos.) */
export function Avatar({ name }: { name: string | null }) {
  const initials = (name || '').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Account" onPress={() => router.navigate('/account')} style={st.avatar}>
      {initials ? <Text style={st.avatarText}>{initials}</Text> : <Icon name="account" size={22} color={colors.accentDark} />}
    </Pressable>
  );
}

export function SearchBar({ onPress, onFilters }: { onPress: () => void; onFilters: () => void }) {
  return (
    <View style={st.search}>
      <Pressable accessibilityRole="search" accessibilityLabel="Search recipes or ingredients" onPress={onPress} style={st.searchMain}>
        <Icon name="browse" size={22} color={colors.body} />
        <Text style={st.searchText}>Search recipes or ingredients</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={onFilters} style={st.searchFilter}>
        <Icon name="sliders" size={22} color={colors.body} />
      </Pressable>
    </View>
  );
}

/** A circular progress ring around a leaf. */
export function Ring({ size = 64, pct = 0.25 }: { size?: number; pct?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} accessibilityElementsHidden>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={7} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.herb} strokeWidth={7} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Icon name="leaf" size={22} color={colors.herb} fill={colors.herbTint} />
    </View>
  );
}

const st = StyleSheet.create({
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentTint, borderWidth: 2, borderColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold, fontSize: 16, color: colors.accentDark },
  search: { flexDirection: 'row', alignItems: 'stretch', height: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, overflow: 'hidden' },
  searchMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  searchText: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  searchFilter: { width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.soft },
});
