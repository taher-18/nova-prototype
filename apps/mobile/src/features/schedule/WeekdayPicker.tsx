import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { colors, radius, space } from '../../theme';

/** Saturday first, the way the week is counted in Egypt. */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

interface Props {
  value: number[];
  onChange: (days: number[]) => void;
  max?: number;
}

/** Tap the weekdays you go to the gym. */
export function WeekdayPicker({ value, onChange, max = 7 }: Props) {
  const { t } = useTranslation();

  function toggle(d: number) {
    if (value.includes(d)) onChange(value.filter((x) => x !== d));
    else if (value.length < max) onChange([...value, d]);
    else return void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    void Haptics.selectionAsync();
  }

  return (
    <View style={styles.grid}>
      {WEEK_ORDER.map((d) => {
        const selected = value.includes(d);
        return (
          <Pressable
            key={d}
            onPress={() => toggle(d)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [styles.tile, selected && styles.selected, pressed && { opacity: 0.8 }]}
          >
            <AppText variant="label" color={selected ? colors.onPrimary : colors.text}>
              {t(`weekdaysLong.${d}` as 'weekdaysLong.0')}
            </AppText>
            {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
