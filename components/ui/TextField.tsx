import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { cn } from './cn';
import { Text } from './Text';

type TextFieldProps = {
  label: string;
  error?: string;
  containerClassName?: string;
} & TextInputProps;

/**
 * Labeled input with a built-in error slot and focus-state border. Accepts
 * plain TextInput props (value/onChangeText/onBlur/...) so it drops directly
 * into react-hook-form's Controller render prop with no extra glue:
 *
 *   <Controller
 *     name="email"
 *     control={control}
 *     render={({ field: { onChange, onBlur, value } }) => (
 *       <TextField label="Email" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.email?.message} />
 *     )}
 *   />
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, containerClassName, className, onFocus, onBlur, ...rest },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={cn('mb-3', containerClassName)}>
      <Text className="mb-1 text-base font-medium text-neutral-400">{label}</Text>
      <TextInput
        ref={ref}
        className={cn(
          'rounded-2xl border bg-neutral-900 px-4 py-3 font-sans text-lg text-neutral-50',
          error ? 'border-red-500' : isFocused ? 'border-amber-400' : 'border-neutral-700',
          className,
        )}
        placeholderTextColor="#737373"
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        {...rest}
      />
      {error ? <Text className="mt-1 text-base text-red-500">{error}</Text> : null}
    </View>
  );
});
