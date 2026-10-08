import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RecipeCard } from '../lib/api';
import { colors, fonts, toneFor } from '../theme';
import { PlateArt } from './Brand';
import { DietTag, PremiumBadge } from './ui';

export function DishImage({ recipe, height, width, radius = 12, artSize = 36 }: {
  recipe: Pick<RecipeCard, 'id' | 'image' | 'title'>; height: number; width?: number | `${number}%`; radius?: number; artSize?: number;
}) {
  return (
    <View style={{ height, width: width ?? '100%', borderRadius: radius, overflow: 'hidden', backgroundColor: toneFor(recipe.id),
      alignItems: 'center', justifyContent: 'center' }}>
      <PlateArt size={artSize} />
      {recipe.image ? (
        <Image source={{ uri: recipe.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150}
          accessibilityLabel={`Photo of ${recipe.title}`} />
      ) : null}
    </View>
  );
}

function meta(r: RecipeCard): string {
  return [r.minutes ? `${r.minutes} min` : null, r.nutrition?.kcal ? `${r.nutrition.kcal} kcal` : null].filter(Boolean).join(' · ');
}

/** Wide card used on Tonight, kitchen results and goals. */
export function RecipeRow({ recipe, onPress, showMatch, showReason }: {
  recipe: RecipeCard; onPress: () => void; showMatch?: boolean; showReason?: boolean;
}) {
  const m = recipe.match;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${recipe.title}${recipe.locked ? ', Premium recipe' : ''}`} onPress={onPress}
      style={({ pressed }) => [st.row, pressed && { opacity: 0.9 }]}>
      <DishImage recipe={recipe} height={showMatch ? 104 : 84} width={88} artSize={34} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={st.tags}>
          {recipe.cuisine ? <Text style={st.cuisine}>{recipe.cuisine}</Text> : null}
          <DietTag vegan={recipe.vegan} vegetarian={recipe.vegetarian} />
          {recipe.locked ? <PremiumBadge small /> : null}
        </View>
        <Text style={st.title} numberOfLines={2}>{recipe.title}</Text>
        {showMatch && m ? (
          <>
            <View style={st.track}><View style={[st.bar, { width: `${m.pct}%`, backgroundColor: m.pct >= 80 ? colors.herb : '#D99A1E' }]} /></View>
            <Text style={st.match}>You have {m.have} of {m.total}</Text>
            <Text style={st.meta} numberOfLines={1}>{m.missing.length ? 'Need: ' + m.missing.slice(0, 3).join(', ') + (m.missing.length > 3 ? ` +${m.missing.length - 3} more` : '') : 'You have everything'}</Text>
          </>
        ) : null}
        {meta(recipe) ? <Text style={st.meta}>{meta(recipe)}{!showMatch && m ? ` · You have ${m.have} of ${m.total}` : ''}</Text> : null}
        {showReason && recipe.reason ? <Text style={st.reason}>{recipe.reason}</Text> : null}
      </View>
    </Pressable>
  );
}

/** Square-ish card for the Browse grid. */
export function RecipeTile({ recipe, onPress }: { recipe: RecipeCard; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${recipe.title}${recipe.locked ? ', Premium recipe' : ''}`} onPress={onPress}
      style={({ pressed }) => [st.tile, pressed && { opacity: 0.9 }]}>
      <View>
        <DishImage recipe={recipe} height={118} radius={0} artSize={40} />
        <View style={st.tileBadges}>
          {recipe.locked ? <PremiumBadge small /> : <View />}
          {recipe.vegan ? <DietTag vegan /> : null}
        </View>
      </View>
      <View style={{ padding: 10, gap: 4 }}>
        {recipe.cuisine ? <Text style={st.cuisine}>{recipe.cuisine}</Text> : null}
        <Text style={[st.title, { fontSize: 15 }]} numberOfLines={2}>{recipe.title}</Text>
        {meta(recipe) ? <Text style={st.meta}>{meta(recipe)}</Text> : null}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, padding: 10, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cuisine: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', color: colors.muted },
  title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  match: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  reason: { fontFamily: fonts.medium, fontSize: 13, color: colors.herbDark },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' },
  bar: { height: 6 },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  tileBadges: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' },
});
