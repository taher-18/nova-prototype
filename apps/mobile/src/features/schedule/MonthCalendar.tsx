import { Ionicons } from '@expo/vector-icons';
import { addDays, fromDateKey, startOfWeek, toDateKey } from '@gymapp/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { SkeletonBlock } from '../../components/Skeleton';
import { colors, radius, space } from '../../theme';
import { DAY_STYLE } from './dayStyle';
import { useCalendar } from './useSchedule';

const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]; // Saturday first

/** Month grid; tap a day to see what was done or planned. */
export function MonthCalendar() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 12);
  });
  const firstKey = toDateKey(month);
  const lastKey = toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0, 12));
  const gridStart = startOfWeek(firstKey);
  const gridEnd = addDays(startOfWeek(lastKey), 6);
  const calendar = useCalendar(gridStart, gridEnd);

  const shift = (delta: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1, 12));
  const title = month.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric' });
  const back = I18nManager.isRTL ? 'chevron-forward' : 'chevron-back';
  const forward = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';

  const weeks: string[][] = [];
  for (let key = gridStart; key <= gridEnd; key = addDays(key, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(key, i)));
  }
  const byDate = new Map(calendar.days?.map((d) => [d.date, d]));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={() => shift(-1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous month">
          <Ionicons name={back} size={22} color={colors.text} />
        </Pressable>
        <AppText variant="label">{title}</AppText>
        <Pressable onPress={() => shift(1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next month">
          <Ionicons name={forward} size={22} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEK_ORDER.map((d) => (
          <AppText key={d} variant="caption" color={colors.muted} style={styles.cellText}>
            {t(`weekdays.${d}` as 'weekdays.0')}
          </AppText>
        ))}
      </View>
      {calendar.days ? (
        weeks.map((week) => (
          <View key={week[0]} style={styles.week}>
            {week.map((key) => {
              const day = byDate.get(key);
              const inMonth = key >= firstKey && key <= lastKey;
              const style = day ? DAY_STYLE[day.status] : DAY_STYLE.rest;
              const show = inMonth && day && day.status !== 'rest';
              return (
                <Pressable
                  key={key}
                  style={styles.cell}
                  disabled={!inMonth}
                  onPress={() => router.push({ pathname: '/day/[date]', params: { date: key } })}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      show && { backgroundColor: style.bg, borderColor: style.border },
                      day?.status === 'upcoming' && inMonth && styles.dashed,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      color={!inMonth ? 'transparent' : show ? style.fg : colors.muted}
                      style={key === calendar.todayKey ? styles.today : undefined}
                    >
                      {fromDateKey(key).getDate()}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))
      ) : (
        <SkeletonBlock height={220} rounded={radius.md} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: space.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xs },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  cellText: { flex: 1, textAlign: 'center' },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashed: { borderStyle: 'dashed' },
  today: { textDecorationLine: 'underline', fontWeight: '700' },
});
