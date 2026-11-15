import { Ionicons } from '@expo/vector-icons';
import { fromDateKey } from '@gymapp/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { colors, space } from '../../theme';
import { DAY_STYLE } from './dayStyle';
import type { CalendarDay } from './useSchedule';

/** Saturday → Friday with each day marked done, missed, today, planned or rest. */
export function WeekStrip({ days, todayKey }: { days: CalendarDay[]; todayKey: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {days.map((d) => {
        const style = DAY_STYLE[d.status];
        const date = fromDateKey(d.date);
        return (
          <Pressable
            key={d.date}
            style={styles.day}
            onPress={() => router.push({ pathname: '/day/[date]', params: { date: d.date } })}
            accessibilityRole="button"
            accessibilityLabel={`${t(`weekdays.${date.getDay()}` as 'weekdays.0')} ${date.getDate()}: ${t(`dayStatus.${d.status}`)}`}
          >
            <AppText variant="caption" color={d.date === todayKey ? colors.primary : colors.muted}>
              {t(`weekdays.${date.getDay()}` as 'weekdays.0')}
            </AppText>
            <View
              style={[
                styles.circle,
                { backgroundColor: style.bg, borderColor: style.border },
                d.status === 'upcoming' && styles.dashed,
              ]}
            >
              {style.icon ? (
                <Ionicons name={style.icon} size={18} color={style.fg} />
              ) : (
                <AppText variant="label" color={style.fg}>{date.getDate()}</AppText>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: space.xs, minWidth: 40, paddingVertical: space.xs },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashed: { borderStyle: 'dashed' },
});
