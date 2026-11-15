import { HOME_GYM_MAX, normalizeGymName, type HomeGymSuggestion } from '@gymapp/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { AppText } from '../../components/AppText';
import { Chip } from '../../components/Chip';
import { TextField } from '../../components/TextField';
import { colors, space } from '../../theme';

/** Trimmed name to save, `null` when empty. Too short returns `'invalid'`. */
export function homeGymValue(text: string): string | null | 'invalid' {
  const name = text.trim();
  if (!name) return null;
  return name.length < 2 ? 'invalid' : name;
}

interface Props {
  value: string;
  onChange: (text: string) => void;
  error?: string | null;
}

/** "Which gym do you train at?" with names other members already use. */
export function HomeGymField({ value, onChange, error }: Props) {
  const { t } = useTranslation();
  const { api } = useAuth();
  const [query, setQuery] = useState(value);

  // Ask the server once typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(value), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const suggestions = useQuery({
    queryKey: ['homeGymSuggestions', normalizeGymName(query)],
    queryFn: () =>
      api.get<{ suggestions: HomeGymSuggestion[] }>(`/v1/home-gyms/suggestions?q=${encodeURIComponent(query)}`),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  });
  const current = normalizeGymName(value);
  const list = (suggestions.data?.suggestions ?? []).filter((s) => normalizeGymName(s.name) !== current);

  return (
    <View style={{ gap: space.sm }}>
      <TextField
        label={t('homeGym.label')}
        placeholder={t('homeGym.placeholder')}
        value={value}
        onChangeText={onChange}
        maxLength={HOME_GYM_MAX}
        autoCapitalize="words"
        autoCorrect={false}
        error={error}
        hint={t('homeGym.hint')}
      />
      {list.length > 0 ? (
        <View style={{ gap: space.xs }}>
          <AppText variant="caption" color={colors.muted}>{t('homeGym.othersTrainAt')}</AppText>
          <View style={styles.chips}>
            {list.map((s) => (
              <Chip key={s.name} label={s.name} selected={false} onPress={() => onChange(s.name)} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm } });
