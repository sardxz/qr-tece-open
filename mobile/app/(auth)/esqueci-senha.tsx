import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AuthShell } from '../../components/ui/AuthShell';
import { FormField } from '../../components/ui/FormField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusNotice } from '../../components/ui/StatusNotice';
import { colors } from '../../components/ui/theme';
import { api, ApiClientError } from '../../lib/api/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('Informe seu e-mail.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setErrorMessage('Digite um e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api<{ ok: true }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail }),
        skipAuth: true,
      });

      setSuccessMessage('Se o e-mail existir, enviaremos um link de redefinição em instantes.');
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 1400);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Não foi possível enviar o link agora.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="recuperar"
      title="A gente te ajuda a voltar"
      subtitle="Informe seu e-mail. Se ele estiver cadastrado, o link de redefinição chega por mensagem."
      footer={
        <Text style={styles.footerText}>
          Lembrou da senha?{' '}
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Voltar para login</Text>
            </Pressable>
          </Link>
        </Text>
      }
    >
      {errorMessage ? <StatusNotice tone="error" message={errorMessage} /> : null}
      {successMessage ? <StatusNotice tone="success" message={successMessage} /> : null}

      <FormField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="seu e-mail"
      />

      <PrimaryButton label="Enviar link" onPress={handleSubmit} loading={isSubmitting} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primaryStrong,
    fontWeight: '700',
  },
});
