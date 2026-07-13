import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Text } from './Text';

type DateRowProps = {
  value: string; // YYYY-MM-DD, matches lib/schemas/movements.ts's `date` field
  onChange: (value: string) => void;
  error?: string;
};

/**
 * Web fallback (Metro picks this file automatically for web builds — see
 * date-row.tsx for the native implementation).
 * @react-native-community/datetimepicker has no web implementation at all,
 * and RN Web's TextInput doesn't expose the underlying `<input>`'s `type`
 * attribute for a real `type="date"` control. A raw HTML `<input
 * type="date">` is the simplest way to still get a real native browser date
 * picker here — reasonable since this app's web build is a dev-preview
 * convenience, not the shipping target (see store/session-store.ts's
 * web/native split for the same reasoning).
 */
export function DateRow({ value, onChange, error }: DateRowProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between py-3.5">
        <Ionicons name="calendar-outline" size={18} color="#a3a3a3" />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fafafa',
            fontSize: 16,
            fontFamily: 'inherit',
            colorScheme: 'dark',
            flex: 1,
            marginLeft: 12,
          }}
        />
      </View>
      {error ? <Text className="mt-1 text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
