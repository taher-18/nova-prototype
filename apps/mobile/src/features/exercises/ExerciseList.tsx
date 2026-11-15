import { EXERCISES, MUSCLES, type Exercise } from '@gymapp/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Chip } from '../../components/Chip';
import { ExerciseImage } from '../../components/ExerciseImage';
import { colors, fonts, radius, space } from '../../theme';

/** Lowercase, no Arabic diacritics/alef variants, so search is forgiving. */
export function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .replace(/[ً-ْ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

interface Props {
  onSelect: (exercise: Exercise) => void;
  /** Shown above the full list (e.g. variations when replacing). */
  header?: React.ReactElement | null;
  exclude?: string[];
}

/** Searchable, muscle-filterable exercise list (library and picker). */
export function ExerciseList({ onSelect, header, exclude = [] }: Props) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = normalizeSearch(query);
    return EXERCISES.filter((e) => !exclude.includes(e.id))
      .filter((e) => !muscle || e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle))
      .filter((e) => !q || normalizeSearch(e.nameEn).includes(q) || normalizeSearch(e.nameAr).includes(q))
      .sort((a, b) => (i18n.language === 'ar' ? a.nameAr.localeCompare(b.nameAr, 'ar') : a.nameEn.localeCompare(b.nameEn)));
  }, [query, muscle, exclude, i18n.language]);

  return (
    <FlatList
      data={results}
      keyExtractor={(e) => e.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('library.search')}
            placeholderTextColor={colors.muted}
            style={styles.search}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          <FlatList
            horizontal
            data={[null, ...MUSCLES]}
            keyExtractor={(m) => m ?? 'all'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.sm }}
            renderItem={({ item }) => (
              <Chip
                label={item ? t(`muscles.${item}` as 'muscles.chest') : t('library.all')}
                selected={muscle === item}
                onPress={() => setMuscle(item)}
              />
            )}
          />
          {header}
        </View>
      }
      ListEmptyComponent={<AppText center color={colors.muted}>{t('library.noResults')}</AppText>}
      renderItem={({ item }) => <ExerciseRow exercise={item} onPress={() => onSelect(item)} />}
    />
  );
}

export function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { t, i18n } = useTranslation();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <ExerciseImage exerciseId={exercise.id} size={64} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label" numberOfLines={2}>
          {i18n.language === 'ar' ? exercise.nameAr : exercise.nameEn}
        </AppText>
        <AppText variant="caption" color={colors.muted} numberOfLines={1}>
          {exercise.primaryMuscles.map((m) => t(`muscles.${m}` as 'muscles.chest')).join(' · ')} ·{' '}
          {t(`equipmentName.${exercise.equipment}`)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.sm },
  search: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
