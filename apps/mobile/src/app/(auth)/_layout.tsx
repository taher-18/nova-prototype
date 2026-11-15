import { Stack } from 'expo-router';
import { colors, fonts } from '../../theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: '',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontFamily: fonts.semibold },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
