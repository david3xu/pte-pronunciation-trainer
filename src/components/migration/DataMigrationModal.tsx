/**
 * Data Migration Modal Component
 *
 * UI for migrating user progress from localStorage to Supabase.
 * Shows progress, handles errors, allows rollback.
 */

import {
    CheckCircledIcon,
    CrossCircledIcon,
    ExclamationTriangleIcon,
    InfoCircledIcon,
    UpdateIcon,
} from '@radix-ui/react-icons';
import { Badge, Button, Card, Flex, Progress, Text } from '@radix-ui/themes';
import React, { useState } from 'react';
import {
    clearOldData,
    getMigrationSummary,
    performMigration,
    rollbackMigration,
    type MigrationProgress,
    type MigrationResult,
} from '../../services/migration/migrationService';
import { useAuth } from '../../stores';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const DataMigrationModal: React.FC<DataMigrationModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { user } = useAuth();

  const [migrationState, setMigrationState] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult] = useState<MigrationResult | null>(null);

  const summary = getMigrationSummary();

  // Handle migration start
  const handleStartMigration = async () => {
    if (!user) {
      setResult({ status: 'error', error: 'You must be signed in to migrate data' });
      setMigrationState('error');
      return;
    }

    setMigrationState('migrating');
    setProgress({ phase: 'detecting', progress: 0, message: 'Starting migration...' });

    const migrationResult = await performMigration(user, (prog) => {
      setProgress(prog);
    });

    setResult(migrationResult);

    if (migrationResult.status === 'success') {
      setMigrationState('success');
    } else if (migrationResult.status === 'error') {
      setMigrationState('error');
    } else {
      setMigrationState('idle');
    }
  };

  // Handle clear data
  const handleClearData = () => {
    clearOldData();
    onComplete();
  };

  // Handle rollback
  const handleRollback = () => {
    const success = rollbackMigration();
    if (success) {
      setMigrationState('idle');
      setResult(null);
      setProgress(null);
    }
  };

  // Handle skip
  const handleSkip = () => {
    // Store that user chose to skip migration
    localStorage.setItem('migration_skipped', 'true');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card size="4" className="w-full max-w-md max-h-[90vh] overflow-y-auto pb-safe">
        {/* Header */}
        <Flex direction="column" gap="4">
          <Flex align="center" gap="2">
            <InfoCircledIcon width="24" height="24" />
            <Text size="6" weight="bold">
              Data Migration
            </Text>
          </Flex>

          {/* Description */}
          {migrationState === 'idle' && (
            <>
              <Text>
                We've found data from your previous sessions stored locally. To ensure your progress is safe and
                accessible across devices, we recommend migrating it to our secure cloud database.
              </Text>

              <Card>
                <Flex direction="column" gap="2">
                  <Text size="2" weight="bold">
                    What will be migrated:
                  </Text>
                  <Flex justify="between">
                    <Text size="2">Practice Sessions:</Text>
                    <Badge>{summary.sessionCount}</Badge>
                  </Flex>
                  <Flex justify="between">
                    <Text size="2">Practice Items:</Text>
                    <Badge>{summary.itemCount}</Badge>
                  </Flex>
                </Flex>
              </Card>

              <Card variant="surface">
                <Flex direction="column" gap="2">
                  <Text size="2" weight="bold" color="blue">
                    <InfoCircledIcon style={{ display: 'inline', marginRight: '4px' }} />
                    Benefits of Migration:
                  </Text>
                  <Text size="1">
                    • Access your progress from any device
                    <br />
                    • Automatic backup of your data
                    <br />
                    • Unlock AI-powered personalized recommendations
                    <br />• Never lose your progress again
                  </Text>
                </Flex>
              </Card>
            </>
          )}

          {/* Migrating State */}
          {migrationState === 'migrating' && progress && (
            <Flex direction="column" gap="3">
              <Text size="2" color="gray">
                {progress.message}
              </Text>
              <Progress value={progress.progress} />
              <Flex align="center" gap="2">
                <UpdateIcon className="animate-spin" />
                <Text size="2" weight="medium">
                  {progress.phase.charAt(0).toUpperCase() + progress.phase.slice(1)}... {progress.progress}%
                </Text>
              </Flex>
            </Flex>
          )}

          {/* Success State */}
          {migrationState === 'success' && result && (
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <CheckCircledIcon width="24" height="24" className="text-green-500" />
                <Text size="4" weight="bold" color="green">
                  Migration Successful!
                </Text>
              </Flex>
              <Text size="2">
                {result.message}
                <br />
                Your data is now safely stored in the cloud.
              </Text>
              <Card variant="surface">
                <Text size="1" color="gray">
                  Your old localStorage data is still available as a backup. You can safely clear it now.
                </Text>
              </Card>
            </Flex>
          )}

          {/* Error State */}
          {migrationState === 'error' && result && (
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <CrossCircledIcon width="24" height="24" className="text-red-500" />
                <Text size="4" weight="bold" color="red">
                  Migration Failed
                </Text>
              </Flex>
              <Text size="2">{result.error || 'An unknown error occurred'}</Text>
              <Card variant="surface">
                <Flex align="center" gap="2">
                  <ExclamationTriangleIcon />
                  <Text size="1" color="gray">
                    Your original data is safe. You can try again or rollback changes.
                  </Text>
                </Flex>
              </Card>
            </Flex>
          )}

          {/* Actions */}
          <Flex gap="2" justify="end">
            {migrationState === 'idle' && (
              <>
                <Button variant="soft" onClick={handleSkip}>
                  Skip for Now
                </Button>
                <Button onClick={handleStartMigration}>Start Migration</Button>
              </>
            )}

            {migrationState === 'migrating' && (
              <Button disabled>
                <UpdateIcon className="animate-spin" />
                Migrating...
              </Button>
            )}

            {migrationState === 'success' && (
              <>
                <Button variant="soft" onClick={onClose}>
                  Keep Backup
                </Button>
                <Button onClick={handleClearData}>Clear Old Data</Button>
              </>
            )}

            {migrationState === 'error' && (
              <>
                <Button variant="soft" color="red" onClick={handleRollback}>
                  Rollback
                </Button>
                <Button variant="soft" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={handleStartMigration}>Try Again</Button>
              </>
            )}
          </Flex>
        </Flex>
      </Card>
    </div>
  );
};

export default DataMigrationModal;
