import { useEffect, useState } from 'react';
import { getLearnerProfile, hasCompletedOnboarding } from '../services/profile/learnerProfileService';
import { useAuth } from '../stores';

export function useOnboarding() {
  const [showProfileOnboarding, setShowProfileOnboarding] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    const checkOnboarding = async () => {
      const user = auth.user;
      if (user && !hasCompletedOnboarding()) {
        console.log('[App] User needs onboarding');
        // Check if profile exists in database
        const profile = await getLearnerProfile(user.id);
        if (!profile || !profile.onboarding_completed) {
          console.log('[App] Showing profile onboarding');
          setShowProfileOnboarding(true);
        }
      }
    };

    checkOnboarding();
  }, [auth.user]);

  return {
    showProfileOnboarding,
    setShowProfileOnboarding,
  };
}
