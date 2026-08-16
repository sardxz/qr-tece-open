import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthShell } from '../../components/ui/AuthShell';
import { FormField } from '../../components/ui/FormField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusNotice } from '../../components/ui/StatusNotice';
import { colors, spacing } from '../../components/ui/theme';
import { ApiClientError } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/context';

export default function LoginScreen() {
  const { login, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/home');
    }
  }, [status]);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage('informe seu e-mail.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setErrorMessage('digite um e-mail válido.');
      return;
    }

    if (!password) {
      setErrorMessage('informe sua senha.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await login(normalizedEmail, password);
      setSuccessMessage('entrada liberada. abrindo seu espaço...');
      router.replace('/home');
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message.toLowerCase());
      } else if (error instanceof Error) {
        setErrorMessage(error.message.toLowerCase());
      } else {
        setErrorMessage('não foi possível entrar agora. tente de novo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      brand=""
      eyebrow=""
      title=""
      subtitle=""
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>ainda não tem conta?</Text>
          <Link href="/(auth)/cadastro" asChild>
            <Pressable>
              <Text style={styles.footerLink}>criar conta</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      <View style={styles.brandWrap}>
        <Text style={styles.brandMark}>qr.tecê?</Text>
      </View>

      {errorMessage ? <StatusNotice tone="error" message={errorMessage} /> : null}
      {successMessage ? <StatusNotice tone="success" message={successMessage} /> : null}

      <FormField
        label="e-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="seu e-mail"
      />

      <FormField
        label="senha"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        secureTextEntry
        placeholder="sua senha"
      />

      <PrimaryButton label="entrar" onPress={handleSubmit} loading={isSubmitting} />

      <View style={styles.inlineActions}>
        <Link href="/(auth)/esqueci-senha" asChild>
          <Pressable>
            <Text style={styles.inlineLink}>esqueci minha senha</Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  brandMark: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.8,
    textTransform: 'lowercase',
    fontStyle: 'italic',
  },
  inlineActions: {
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  inlineLink: {
    color: colors.primaryStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: colors.primaryStrong,
    fontSize: 14,
    fontWeight: '700',
  },
});
