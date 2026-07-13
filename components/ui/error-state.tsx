import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

/**
 * Shared "the request failed" placeholder — distinct from a screen's own
 * empty-list message, so a network/API failure doesn't render identically
 * to "you genuinely have no data yet" (the app has no toasts, so this is
 * the only feedback a failed fetch gets). Used wherever a screen's primary
 * query has `isError` set.
 */
export function ErrorState({ message = 'No pudimos cargar los datos.', onRetry }: ErrorStateProps) {
  return (
    <View className="mt-6 items-center px-6">
      <Ionicons name="cloud-offline-outline" size={40} color="#ef4444" />
      <Text className="mt-3 text-center text-lg text-neutral-300">{message}</Text>
      {onRetry ? (
        <Button className="mt-4" size="sm" variant="secondary" onPress={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </View>
  );
}
