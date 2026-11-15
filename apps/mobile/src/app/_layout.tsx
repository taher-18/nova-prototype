import '../web/setup';
import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from '@expo-google-fonts/cairo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { ActiveWorkoutProvider } from '../features/workout/ActiveWorkoutProvider';
import { configureNotifications } from '../features/workout/feedback';
import { ReminderSync } from '../features/reminders/ReminderSync';
import { NOTIFICATIONS } from '../prototype/config';
import { captureTesterId, track } from '../prototype/tracking';
import { DataProvider } from '../sync/DataProvider';
import { bootstrapLanguage } from '../i18n/language';
import { LanguageChoice, useLanguageChoice } from '../i18n/LanguageChoice';
import { colors, fonts } from '../theme';

void SplashScreen.preventAutoHideAsync();
configureNotifications();
// Prototype mode: remember who is testing (?t=T1) and count the visit.
captureTesterId();
track('app_open');

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });
  const [languageChosen, setLanguageChosen] = useState<boolean | null>(null);

  useEffect(() => {
    bootstrapLanguage().then(({ chosen, reloading }) => {
      if (!reloading) setLanguageChosen(chosen);
    });
  }, []);

  if (!fontsLoaded || languageChosen === null) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <LanguageChoice.Provider value={{ chosen: languageChosen, markChosen: () => setLanguageChosen(true) }}>
          <AuthProvider>
            <StatusBar style={colors.statusBar} />
            <RootNavigator />
          </AuthProvider>
        </LanguageChoice.Provider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status, user } = useAuth();
  const { chosen } = useLanguageChoice();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;

  const signedIn = status === 'signedIn' && !!user;
  const onboarded = signedIn && user.onboarded;

  return (
    <SignedInProviders signedIn={signedIn}>
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.semibold, color: colors.text },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
      }}
    >
      <Stack.Protected guard={!chosen}>
        <Stack.Screen name="language" />
      </Stack.Protected>
      <Stack.Protected guard={chosen && !signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={chosen && signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={chosen && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plan/[dayIndex]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="retake-quiz" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="delete-account" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: true }} />
        <Stack.Screen name="exercises/index" options={{ headerShown: true }} />
        <Stack.Screen name="exercises/[id]" options={{ headerShown: true }} />
        <Stack.Screen
          name="session/active"
          options={{ gestureEnabled: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="session/pick-exercise" options={{ presentation: 'modal', headerShown: true }} />
        <Stack.Screen name="session/finish" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="session/plates" options={{ presentation: 'modal', headerShown: true }} />
        <Stack.Screen name="coach" options={{ presentation: 'modal', headerShown: true }} />
        <Stack.Screen name="day/[date]" options={{ headerShown: true }} />
        <Stack.Screen name="schedule/edit" options={{ headerShown: true }} />
        <Stack.Screen name="body/[kind]" options={{ headerShown: true }} />
      </Stack.Protected>
    </Stack>
    </SignedInProviders>
  );
}

/** Local database, sync and the active workout exist only while signed in. */
function SignedInProviders({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  if (!signedIn) return children;
  return (
    <DataProvider>
      <ActiveWorkoutProvider>
        {children}
        {NOTIFICATIONS ? <ReminderSync /> : null}
      </ActiveWorkoutProvider>
    </DataProvider>
  );
}
