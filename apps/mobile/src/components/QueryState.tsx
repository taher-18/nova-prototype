import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { errorKey } from '../lib/api';
import { space } from '../theme';
import { EmptyState } from './EmptyState';
import { SkeletonCards, SkeletonHero } from './Skeleton';

/** Skeleton while loading, or an error with retry. */
export function QueryState({
  isPending,
  error,
  onRetry,
  skeleton = 'cards',
}: {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  skeleton?: 'cards' | 'hero';
}) {
  const { t } = useTranslation();
  if (isPending) {
    return skeleton === 'hero' ? (
      <View style={{ gap: space.lg }}>
        <SkeletonHero />
        <SkeletonCards count={2} />
      </View>
    ) : (
      <SkeletonCards />
    );
  }
  if (error) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title={t(errorKey(error) as 'errors.unknown')}
        action={{ label: t('common.retry'), onPress: onRetry }}
      />
    );
  }
  return null;
}
