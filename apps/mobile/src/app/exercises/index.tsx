import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ExerciseList } from '../../features/exercises/ExerciseList';
import { colors } from '../../theme';

export default function LibraryScreen() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: t('library.title') }} />
      <ExerciseList onSelect={(e) => router.push({ pathname: '/exercises/[id]', params: { id: e.id } })} />
    </View>
  );
}
