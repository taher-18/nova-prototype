import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { Gender } from '@gymapp/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthProvider';
import { rememberGender } from '../../features/profile/gender';
import { useActiveWorkout } from '../../features/workout/ActiveWorkoutProvider';
import { colors, fonts } from '../../theme';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Keeps the weekly goal and gender on the phone so streaks and photos work offline. */
function useWeeklyGoalSync() {
  const { api } = useAuth();
  const { setWeeklyGoal } = useActiveWorkout();
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<{ weeklyGoal: number; gender: Gender }>('/v1/me/profile'),
  });
  const goal = profile.data?.weeklyGoal;
  const gender = profile.data?.gender;
  useEffect(() => {
    if (goal) setWeeklyGoal(goal);
  }, [goal, setWeeklyGoal]);
  useEffect(() => {
    if (gender) rememberGender(gender);
  }, [gender]);
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useWeeklyGoalSync();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, flexShrink: 0 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // Web: the default bar is too short for the labels; leave room for the iPhone home bar.
          ...(Platform.OS === 'web' ? { height: 68 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4 } : null),
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="plan"
        options={{ title: t('tabs.plan'), tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="workout"
        options={{ title: t('tabsExtra.workout'), tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: t('tabsExtra.progress'), tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
