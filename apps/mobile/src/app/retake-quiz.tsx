import type { OnboardingAnswers } from '@gymapp/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { SkeletonCards } from '../components/Skeleton';
import { useAuth } from '../auth/AuthProvider';
import { OnboardingFlow } from '../features/onboarding/OnboardingFlow';
import { colors } from '../theme';

export default function RetakeQuizScreen() {
  const { api, setUser } = useAuth();
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<Partial<OnboardingAnswers>>('/v1/me/profile'),
  });

  if (profile.isPending) {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: 80, backgroundColor: colors.bg }}>
        <SkeletonCards count={4} />
      </View>
    );
  }

  const { gender, goal, experience, equipment, daysPerWeek, trainingDays, sessionMinutes, birthYear, heightCm, homeGym } = profile.data ?? {};
  return (
    <OnboardingFlow
      initial={{ gender, goal, experience, equipment, daysPerWeek, trainingDays, sessionMinutes, homeGym, birthYear: birthYear ?? undefined, heightCm: heightCm ?? undefined }}
      onExit={() => router.back()}
      onDone={async (user) => {
        await setUser(user);
        router.back();
      }}
    />
  );
}
