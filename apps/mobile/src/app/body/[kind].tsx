import { Ionicons } from '@expo/vector-icons';
import { BODY_METRIC_KINDS, BODY_METRIC_UNITS, isValidMetric, type BodyMetricKind } from '@gymapp/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { LineChart } from '../../components/LineChart';
import { Screen } from '../../components/Screen';
import { SkeletonCards } from '../../components/Skeleton';
import { TextField } from '../../components/TextField';
import { useBodyMetric, useBodyMetricActions } from '../../features/progress/useBodyMetrics';
import { parseUserNumber } from '../../lib/digits';
import { formatKg, formatShortDate } from '../../lib/format';
import { colors, radius, space } from '../../theme';

export default function BodyMetricScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ kind: string }>();
  const kind: BodyMetricKind = BODY_METRIC_KINDS.find((k) => k === params.kind) ?? 'weight';
  const unit = BODY_METRIC_UNITS[kind];
  const entries = useBodyMetric(kind);
  const { log, remove } = useBodyMetricActions();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function add() {
    const value = parseUserNumber(text);
    if (value === undefined || !isValidMetric(kind, value)) return setError(t('progress.invalid'));
    setError(null);
    setSaving(true);
    try {
      await log(kind, Math.round(value * 10) / 10);
      setText('');
    } finally {
      setSaving(false);
    }
  }

  const list = entries.data ?? [];
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t(`metrics.${kind}`) }} />
      <View style={styles.card}>
        <TextField
          label={`${t('progress.value')} (${unit})`}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          ltr
          error={error}
          maxLength={6}
          onSubmitEditing={add}
        />
        <Button title={t('progress.addEntry')} loading={saving} onPress={add} />
      </View>

      {entries.isPending ? (
        <SkeletonCards count={3} height={56} />
      ) : list.length === 0 ? (
        <EmptyState icon="body-outline" title={t('progress.noEntries')} />
      ) : (
        <>
          {list.length > 1 ? (
            <View style={styles.card}>
              <LineChart
                points={list.map((e) => ({ x: e.loggedAt, y: e.value }))}
                formatY={(y) => `${formatKg(y)} ${unit}`}
                formatX={(x) => formatShortDate(x, i18n.language)}
              />
            </View>
          ) : null}
          <AppText variant="heading">{t('progress.history')}</AppText>
          <View style={styles.list}>
            {[...list].reverse().map((e) => (
              <View key={e.id} style={styles.row}>
                <AppText color={colors.muted} style={{ flex: 1 }}>{formatShortDate(e.loggedAt, i18n.language)}</AppText>
                <AppText variant="label" style={{ writingDirection: 'ltr' }}>
                  {formatKg(e.value)} {unit}
                </AppText>
                <Pressable
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t('progress.delete')}
                  onPress={() =>
                    Alert.alert(t('progress.deleteEntry'), undefined, [
                      { text: t('common.cancel'), style: 'cancel' },
                      { text: t('progress.delete'), style: 'destructive', onPress: () => void remove(e) },
                    ])
                  }
                >
                  <Ionicons name="trash-outline" size={20} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
