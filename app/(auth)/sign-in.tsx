import { useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { signIn } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/show-api-error';
import { signInSchema, type SignInFormValues } from '@/lib/schemas/auth';
import { useSessionStore } from '@/store/session-store';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';

export default function SignInScreen() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: SignInFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await signIn(values);
      // Sign-in's form only collects email (no name) — `name` keeps whatever
      // was last persisted (or null) until the user signs up again.
      await setSession({ token: result.accessToken, userId: result.id, email: values.email });
      router.replace('/');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* The logo's wordmark is dark navy — a soft light backdrop keeps it
          readable instead of nearly vanishing into the app's near-black
          background. */}
      <View className="mb-10 self-center rounded-2xl bg-neutral-50 p-3">
        <Image
          source={require('../../assets/xarvis-logo-transparent.png')}
          style={{ width: 100, height: 100 }}
          resizeMode="contain"
        />
      </View>

      <Text className="mb-8 text-center text-2xl font-bold text-neutral-50">Iniciar sesión</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Correo electrónico"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="tu@ejemplo.com"
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Contraseña"
            autoCapitalize="none"
            secureTextEntry
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="********"
            error={errors.password?.message}
          />
        )}
      />

      {errorMessage ? <Text className="mb-3 text-center text-sm text-red-500">{errorMessage}</Text> : null}

      <Button className="mt-3" isLoading={isSubmitting} onPress={handleSubmit(onSubmit)}>
        Iniciar sesión
      </Button>

      <Link href="/(auth)/sign-up" asChild>
        <Pressable className="mt-6" accessibilityRole="button">
          <Text className="text-center text-amber-400">¿No tienes una cuenta? Regístrate</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
