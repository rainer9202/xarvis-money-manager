import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { signUp } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/show-api-error';
import { signUpSchema, type SignUpFormValues } from '@/lib/schemas/auth';
import { useSessionStore } from '@/store/session-store';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';

export default function SignUpScreen() {
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await signUp(values);
      await setSession({ token: result.accessToken, userId: result.id, name: values.name, email: values.email });
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
      <Text className="mb-8 text-3xl font-bold text-neutral-50">Crea tu cuenta</Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Nombre"
            autoComplete="name"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="Juan Pérez"
            error={errors.name?.message}
          />
        )}
      />

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
            placeholder="Al menos 8 caracteres"
            error={errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Confirmar contraseña"
            autoCapitalize="none"
            secureTextEntry
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            placeholder="Vuelve a ingresar tu contraseña"
            error={errors.confirmPassword?.message}
          />
        )}
      />

      {errorMessage ? <Text className="mb-3 text-center text-sm text-red-500">{errorMessage}</Text> : null}

      <Button className="mt-3" isLoading={isSubmitting} onPress={handleSubmit(onSubmit)}>
        Registrarme
      </Button>

      <Link href="/(auth)/sign-in" asChild>
        <Pressable className="mt-6" accessibilityRole="button">
          <Text className="text-center text-amber-400">¿Ya tienes una cuenta? Inicia sesión</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
