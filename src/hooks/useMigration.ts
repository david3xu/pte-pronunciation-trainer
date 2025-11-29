import { useEffect, useState } from 'react';
import { hasDataToMigrate } from '../services/migration/migrationService';
import { useAppStore } from '../stores';

export function useMigration() {
  const [showMigration, setShowMigration] = useState(false);
  const auth = useAppStore((state) => state.auth);

  useEffect(() => {
    const checkMigration = () => {
      const user = auth.user;
      if (user && hasDataToMigrate()) {
        console.log('Migration data detected for signed-in user');
        setShowMigration(true);
      }
    };

    checkMigration();
  }, [auth.user]);

  return {
    showMigration,
    setShowMigration,
  };
}
