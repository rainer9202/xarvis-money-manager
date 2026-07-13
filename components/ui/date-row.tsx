import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';

import { Text } from './Text';

type DateRowProps = {
  value: string; // YYYY-MM-DD, matches lib/schemas/movements.ts's `date` field
  onChange: (value: string) => void;
  error?: string;
};

/**
 * Native date row (iOS/Android) — Metro picks date-row.web.tsx for web
 * builds, since @react-native-community/datetimepicker has no web
 * implementation at all (confirmed: no .web.* files in the package).
 *
 * Android's `DateTimePicker` component renders inline/always-visible if
 * mounted directly, unlike iOS — the library's own documented pattern is to
 * use the imperative `DateTimePickerAndroid.open()` API on Android (a real
 * native dialog, no visibility state to manage) and only mount the
 * declarative `<DateTimePicker>` component on iOS (toggled by local state).
 */
export function DateRow({ value, onChange, error }: DateRowProps) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const date = dayjs(value, 'YYYY-MM-DD').isValid() ? dayjs(value, 'YYYY-MM-DD').toDate() : new Date();

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        onChange: (_event, selectedDate) => {
          if (selectedDate) onChange(dayjs(selectedDate).format('YYYY-MM-DD'));
        },
      });
      return;
    }
    setShowIOSPicker(true);
  };

  return (
    <View>
      <Pressable
        className="flex-row items-center justify-between py-3.5"
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Fecha"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="calendar-outline" size={18} color="#a3a3a3" />
          <Text className="text-base text-neutral-50">{dayjs(date).format('MMM D, YYYY')}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="#737373" />
      </Pressable>
      {error ? <Text className="mt-1 text-sm text-red-500">{error}</Text> : null}

      {showIOSPicker ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          onChange={(_event, selectedDate) => {
            setShowIOSPicker(false);
            if (selectedDate) onChange(dayjs(selectedDate).format('YYYY-MM-DD'));
          }}
        />
      ) : null}
    </View>
  );
}
