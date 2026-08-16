import { Link, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AuthShell } from '../../components/ui/AuthShell';
import { FormField } from '../../components/ui/FormField';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { StatusNotice } from '../../components/ui/StatusNotice';
import { colors, radius, spacing } from '../../components/ui/theme';
import { api, ApiClientError } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/context';

type CadastroResponse = {
  user: {
    id: string;
    email: string;
    username: string;
    role: 'USER' | 'ADMIN';
  };
  token: string;
};

type Gender = 'H' | 'M' | null;

type FormErrors = Partial<Record<'inviteCode' | 'email' | 'username' | 'gender' | 'password' | 'terms', string>>;

export default function CadastroScreen() {
  const params = useLocalSearchParams<{ convite?: string | string[] }>();
  const initialInvite = useMemo(() => {
    const raw = Array.isArray(params.convite) ? params.convite[0] : params.convite;
    return raw ?? '';
  }, [params.convite]);
  const { login } = useAuth();

  const [inviteCode, setInviteCode] = useState(initialInvite);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<Gender>(null);
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = () => {
    const nextErrors: FormErrors = {};
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedInviteCode = inviteCode.trim();

    if (!normalizedInviteCode) {
      nextErrors.inviteCode = 'Informe seu código de convite.';
    }

    if (!normalizedEmail) {
      nextErrors.email = 'Informe seu e-mail.';
    } else if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      nextErrors.email = 'Digite um e-mail válido.';
    }

    if (!normalizedUsername) {
      nextErrors.username = 'Escolha um username.';
    } else if (normalizedUsername.length < 3) {
      nextErrors.username = 'Use pelo menos 3 caracteres.';
    } else if (normalizedUsername.length > 30) {
      nextErrors.username = 'Use no máximo 30 caracteres.';
    } else if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      nextErrors.username = 'Use só letras minúsculas, números e _.';
    }

    if (!gender) {
      nextErrors.gender = 'Selecione seu gênero.';
    }

    if (!password) {
      nextErrors.password = 'Crie uma senha.';
    } else if (password.length < 8) {
      nextErrors.password = 'A senha precisa ter pelo menos 8 caracteres.';
    } else if (password.length > 100) {
      nextErrors.password = 'A senha está longa demais.';
    }

    if (!termsAccepted) {
      nextErrors.terms = 'Você precisa aceitar os termos para continuar.';
    }

    setErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      normalizedEmail,
      normalizedUsername,
      normalizedInviteCode,
    };
  };

  const handleSubmit = async () => {
    const { isValid, normalizedEmail, normalizedUsername, normalizedInviteCode } = validate();

    if (!isValid || !gender) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api<CadastroResponse>('/api/auth/cadastro', {
        method: 'POST',
        body: JSON.stringify({
          inviteCode: normalizedInviteCode,
          email: normalizedEmail,
          username: normalizedUsername,
          gender,
          password,
          termsAccepted: true,
        }),
        skipAuth: true,
      });

      setSuccessMessage('Conta criada. Entrando agora…');
      await login(normalizedEmail, password);
      router.replace('/home');
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Não foi possível criar sua conta agora.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="cadastro"
      title="Entre por convite e plante sua presença"
      subtitle="Seu acesso ao qr.tecê começa com um convite válido e alguns dados básicos."
      footer={
        <Text style={styles.footerText}>
          Já tem conta?{' '}
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Entrar</Text>
            </Pressable>
          </Link>
        </Text>
      }
    >
      {errorMessage ? <StatusNotice tone="error" message={errorMessage} /> : null}
      {successMessage ? <StatusNotice tone="success" message={successMessage} /> : null}

      <FormField
        label="Código de convite"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Seu convite"
        error={errors.inviteCode}
      />

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
        error={errors.email}
      />

      <FormField
        label="Username"
        value={username}
        onChangeText={(value) => setUsername(value.toLowerCase())}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="seu_nome"
        hint="Use 3 a 30 caracteres com letras minúsculas, números e _."
        error={errors.username}
      />

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Gênero</Text>
        <View style={styles.genderRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setGender('H')}
            style={[styles.genderButton, gender === 'H' ? styles.genderButtonActive : null]}
          >
            <Text style={[styles.genderText, gender === 'H' ? styles.genderTextActive : null]}>Homem</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setGender('M')}
            style={[styles.genderButton, gender === 'M' ? styles.genderButtonActive : null]}
          >
            <Text style={[styles.genderText, gender === 'M' ? styles.genderTextActive : null]}>Mulher</Text>
          </Pressable>
        </View>
        {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
      </View>

      <FormField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        secureTextEntry
        placeholder="Crie uma senha"
        hint="Mínimo de 8 caracteres."
        error={errors.password}
      />

      <View style={styles.termsRow}>
        <View style={styles.termsText}>
          <Text style={styles.groupLabel}>Aceito os termos</Text>
          <Text style={styles.termsHint}>É preciso aceitar os termos para concluir seu cadastro.</Text>
        </View>
        <Switch
          value={termsAccepted}
          onValueChange={setTermsAccepted}
          trackColor={{ false: '#2b2e48', true: '#5f2dcf' }}
          thumbColor={termsAccepted ? '#f7f2ff' : '#d2d0e9'}
        />
      </View>
      {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

      <PrimaryButton label="Criar conta" onPress={handleSubmit} loading={isSubmitting} />
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
  group: {
    gap: spacing.xs,
  },
  groupLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
  },
  genderText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  genderTextActive: {
    color: colors.text,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  termsText: {
    flex: 1,
    gap: 4,
  },
  termsHint: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
});
