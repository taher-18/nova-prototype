import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Chip } from '../../components/Chip';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { parseUserNumber } from '../../lib/digits';
import { formatKg } from '../../lib/format';
import { platesFor } from '../../features/workout/plates';
import { colors, radius, space } from '../../theme';

/** Standard Olympic plate colours, so the picture matches the gym. */
const PLATE_COLORS: Record<string, string> = {
  '25': '#D32F2F',
  '20': '#1976D2',
  '15': '#F9A825',
  '10': '#388E3C',
  '5': '#ECEFF1',
  '2.5': '#424242',
  '1.25': '#9E9E9E',
};

export default function PlatesScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ kg?: string }>();
  const [text, setText] = useState(params.kg ?? '60');
  const [bar, setBar] = useState(20);
  const target = parseUserNumber(text) ?? 0;
  const load = platesFor(target, bar);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('plates.title') }} />
      <TextField label={`${t('plates.target')} (kg)`} value={text} onChangeText={setText} keyboardType="decimal-pad" ltr maxLength={6} />
      <View style={styles.bars}>
        <AppText variant="label">{t('plates.bar')}</AppText>
        {[20, 15, 10].map((b) => (
          <Chip key={b} label={`${b} kg`} selected={bar === b} onPress={() => setBar(b)} />
        ))}
      </View>

      <View style={styles.card}>
        <AppText variant="caption" color={colors.muted}>{t('plates.perSide')}</AppText>
        {load.perSide.length === 0 ? (
          <AppText variant="heading">{t('plates.emptyBar')}</AppText>
        ) : (
          <>
            {/* Bar sleeve with plates, heaviest closest to the centre. */}
            <View style={styles.sleeve}>
              <View style={styles.collar} />
              {load.perSide.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.plate,
                    {
                      height: 40 + Math.min(1, p / 25) * 80,
                      backgroundColor: PLATE_COLORS[String(p)] ?? colors.muted,
                    },
                  ]}
                />
              ))}
              <View style={styles.bar} />
            </View>
            <AppText variant="title" style={styles.ltr}>
              {load.perSide.map((p) => formatKg(p)).join(' + ')}
            </AppText>
          </>
        )}
        <AppText color={colors.muted} style={styles.ltr}>
          {formatKg(bar)} + 2 × {formatKg((load.totalKg - bar) / 2)} = {formatKg(load.totalKg)} kg
        </AppText>
        {load.missingKg > 0 ? (
          <AppText variant="caption" color={colors.warning}>{t('plates.missing', { kg: formatKg(load.missingKg) })}</AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  sleeve: { flexDirection: 'row', alignItems: 'center', height: 130, direction: 'ltr' },
  collar: { width: 10, height: 50, backgroundColor: colors.muted, borderRadius: 3, marginEnd: 2 },
  plate: { width: 16, marginEnd: 3, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)' },
  bar: { flex: 1, height: 14, backgroundColor: colors.muted, borderRadius: 7 },
  ltr: { writingDirection: 'ltr' },
});
