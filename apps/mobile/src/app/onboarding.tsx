import { useAuth } from '../auth/AuthProvider';
import { OnboardingFlow } from '../features/onboarding/OnboardingFlow';

export default function OnboardingScreen() {
  const { setUser } = useAuth();
  // Marking the user onboarded switches the navigator to the main tabs.
  return <OnboardingFlow onDone={(user) => void setUser(user)} />;
}
