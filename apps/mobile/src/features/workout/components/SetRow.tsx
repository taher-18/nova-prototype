import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/AppText';
import { formatKg } from '../../../lib/format';
import { colors, radius, space } from '../../../theme';
import type { ActiveExercise, ActiveSet } from '../engine';
import { NumberCell } from './NumberCell';

interface Props {
  exercise: ActiveExercise;
  set: ActiveSet;
  index: number;
  current: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Pick<ActiveSet, 'weightKg' | 'reps' | 'durationSec'>>) => void;
  onRemove: () => void;
}

function previousLabel(set: ActiveSet, exercise: ActiveExercise, dash: string) {
  const p = set.previous;
  if (!p) return dash;
  if (exercise.tracking === 'time') return p.durationSec ? `${p.durationSec}s` : dash;
  if (p.weightKg) return `${formatKg(p.weightKg)}×${p.reps ?? '?'}`;
  return p.reps ? `×${p.reps}` : dash;
}

/** One set: last time's numbers, editable weight/reps, and a big done button. */
export function SetRow({ exercise, set, index, current, onToggle, onChange, onRemove }: Props) {
  const { t } = useTranslation();
  const time = exercise.tracking === 'time';

  return (
    <Pressable
      onLongPress={() =>
        Alert.alert(t('workout.set'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('workout.removeSet'), style: 'destructive', onPress: onRemove },
        ])
      }
      style={[styles.row, current && styles.current, set.done && styles.done]}
    >
      <View style={styles.index}>
        <AppText variant="label" color={set.done ? colors.success : current ? colors.primary : colors.muted}>
          {index + 1}
        </AppText>
      </View>
      <AppText variant="caption" color={colors.muted} style={styles.previous} numberOfLines={1}>
        {previousLabel(set, exercise, t('workout.lastNone'))}
      </AppText>
      {time ? (
        <NumberCell
          value={set.durationSec}
          onChange={(v) => onChange({ durationSec: v })}
          done={set.done}
          accessibilityLabel={t('workout.sec')}
        />
      ) : (
        <>
          {exercise.loaded ? (
            <NumberCell
              value={set.weightKg}
              onChange={(v) => onChange({ weightKg: v })}
              decimal
              placeholder={t('workout.kg')}
              done={set.done}
              accessibilityLabel={t('workout.kg')}
            />
          ) : null}
          <NumberCell
            value={set.reps}
            onChange={(v) => onChange({ reps: v })}
            done={set.done}
            accessibilityLabel={t('workout.reps')}
          />
        </>
      )}
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        style={[styles.check, set.done && styles.checkDone]}
      >
        <Ionicons name="checkmark" size={28} color={set.done ? colors.onPrimary : colors.muted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    minHeight: 64,
  },
  current: { backgroundColor: colors.primarySoft },
  done: { backgroundColor: colors.successSoft },
  index: { width: 28, alignItems: 'center' },
  previous: { flex: 1 },
  check: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg,
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
});
