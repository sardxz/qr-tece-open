import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppBackground } from '../../components/ui/AppBackground';
import { StatusNotice } from '../../components/ui/StatusNotice';
import { colors, radius, spacing } from '../../components/ui/theme';
import { ApiClientError, api } from '../../lib/api/client';
import { useAuth } from '../../lib/auth/context';

type InviteCode = { code: string; createdAt: string };

type InvitesStatus = {
  quota: number | null;
  usedThisMonth: number;
  generatedThisMonth: number;
  activeInvite: InviteCode | null;
  activeInvites: InviteCode[];
  canGenerate: boolean;
  isAdmin: boolean;
  nextResetAt: string;
  bonusRemaining: number;
};

export default function ConfiguracoesScreen() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  // ============= Alterar senha =============
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const passwordMutation = useMutation({
    mutationFn: async () =>
      api('/api/users/me/password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setPasswordFeedback({ tone: 'success', message: 'senha alterada com sucesso.' });
    },
    onError: (error) => {
      const message =
        error instanceof ApiClientError ? error.message.toLowerCase() : 'não foi possível alterar a senha.';
      setPasswordFeedback({ tone: 'error', message });
    },
  });

  const handleChangePassword = () => {
    setPasswordFeedback(null);
    if (!currentPassword || !newPassword) {
      setPasswordFeedback({ tone: 'error', message: 'preencha os dois campos.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordFeedback({ tone: 'error', message: 'a nova senha precisa ter pelo menos 8 caracteres.' });
      return;
    }
    passwordMutation.mutate();
  };

  // ============= Convites =============
  const invitesQuery = useQuery({
    queryKey: ['invites', 'status'],
    queryFn: () => api<InvitesStatus>('/api/invites'),
  });

  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async () => api<{ code: string; reused: boolean }>('/api/invites', { method: 'POST' }),
    onSuccess: () => {
      setInviteFeedback(null);
      queryClient.invalidateQueries({ queryKey: ['invites', 'status'] });
    },
    onError: (error) => {
      setInviteFeedback(error instanceof ApiClientError ? error.message.toLowerCase() : 'erro ao gerar convite.');
    },
  });

  const handleShareInvite = async (code: string) => {
    const url = `https://qrtece.com.br/cadastro?convite=${code}`;
    try {
      await Share.share({
        message: `te convidei pro qr.tecê — entra usando esse link: ${url}`,
      });
    } catch {
      // usuário cancelou — silencioso
    }
  };

  // ============= Excluir conta =============
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async () => api('/api/users/me', { method: 'DELETE' }),
    onSuccess: async () => {
      setDeleteOpen(false);
      try {
        await logout();
      } finally {
        router.replace('/');
      }
    },
    onError: (error) => {
      setDeleteError(
        error instanceof ApiClientError ? error.message.toLowerCase() : 'não foi possível excluir a conta.'
      );
    },
  });

  const handleDeleteAccount = () => {
    setDeleteError(null);
    if (deleteConfirm.trim().toUpperCase() !== 'EXCLUIR') {
      setDeleteError('digite EXCLUIR exatamente como mostrado para confirmar.');
      return;
    }
    deleteMutation.mutate();
  };

  const closeDeleteModal = () => {
    setDeleteOpen(false);
    setDeleteConfirm('');
    setDeleteError(null);
  };

  // ============= Versão / OTA =============
  const appVersion = Constants.expoConfig?.version ?? '?';
  const otaInfo = (() => {
    if (Updates.isEmbeddedLaunch || !Updates.updateId) {
      return 'embedded (sem OTA aplicado)';
    }
    const shortId = Updates.updateId.slice(0, 8);
    if (!Updates.createdAt) return shortId;
    const d = Updates.createdAt;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const stamp = `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    return `${stamp} · ${shortId}`;
  })();
  const channel = Updates.channel ?? 'sem canal';

  // Lista de convites pendentes. Usa activeInvites (todos) quando disponível e
  // cai para activeInvite (singular) enquanto o backend novo não está no ar.
  const invitesData = invitesQuery.data;
  const allActiveInvites: InviteCode[] =
    invitesData?.activeInvites ?? (invitesData?.activeInvite ? [invitesData.activeInvite] : []);
  // Admin gera convites ilimitados — mostrar só o último evita uma lista gigante.
  // Os anteriores continuam válidos no banco, apenas não aparecem na tela.
  const activeInvites = invitesData?.isAdmin ? allActiveInvites.slice(0, 1) : allActiveInvites;

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} hitSlop={10}>
                <Text style={styles.headerAction}>voltar</Text>
              </Pressable>
              <Text style={styles.headerTitle}>configurações</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* ============= Alterar senha ============= */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>alterar senha</Text>

              <Text style={styles.label}>senha atual</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPass}
                  placeholder="digite sua senha atual"
                  placeholderTextColor={colors.textSoft}
                  style={[styles.input, styles.passwordInput]}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowCurrentPass(v => !v)} style={styles.eyeButton} hitSlop={8}>
                  <Ionicons name={showCurrentPass ? 'eye-off' : 'eye'} size={20} color={colors.textSoft} />
                </Pressable>
              </View>

              <Text style={styles.label}>nova senha</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPass}
                  placeholder="pelo menos 8 caracteres"
                  placeholderTextColor={colors.textSoft}
                  style={[styles.input, styles.passwordInput]}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowNewPass(v => !v)} style={styles.eyeButton} hitSlop={8}>
                  <Ionicons name={showNewPass ? 'eye-off' : 'eye'} size={20} color={colors.textSoft} />
                </Pressable>
              </View>

              {passwordFeedback ? (
                <StatusNotice tone={passwordFeedback.tone} message={passwordFeedback.message} />
              ) : null}

              <Pressable
                onPress={handleChangePassword}
                disabled={passwordMutation.isPending}
                style={[styles.primaryButton, passwordMutation.isPending ? styles.buttonDisabled : null]}
              >
                {passwordMutation.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>salvar</Text>
                )}
              </Pressable>
            </View>

            {/* ============= Convites ============= */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>convites</Text>

              {invitesQuery.isLoading ? (
                <ActivityIndicator color={colors.primaryStrong} />
              ) : invitesQuery.isError || !invitesQuery.data ? (
                <Text style={styles.errorText}>não foi possível carregar seus convites.</Text>
              ) : (
                <>
                  <Text style={styles.muted}>
                    cota mensal: {invitesQuery.data.quota === null ? 'ilimitada' : invitesQuery.data.quota}
                    {invitesQuery.data.bonusRemaining > 0 ? ` (+${invitesQuery.data.bonusRemaining} bônus)` : ''}
                  </Text>
                  <Text style={styles.muted}>
                    usados este mês: {invitesQuery.data.usedThisMonth} · gerados: {invitesQuery.data.generatedThisMonth}
                  </Text>

                  {activeInvites.length > 0 ? (
                    <View style={styles.codeBox}>
                      <Text style={styles.codeLabel}>
                        {activeInvites.length > 1 ? 'convites ativos:' : 'convite ativo:'}
                      </Text>
                      {activeInvites.map((invite) => (
                        <View key={invite.code} style={styles.codeRow}>
                          <Text selectable style={styles.code}>{invite.code}</Text>
                          <Pressable
                            onPress={() => handleShareInvite(invite.code)}
                            hitSlop={8}
                            style={styles.shareIconButton}
                          >
                            <Ionicons name="share-social-outline" size={20} color={colors.primaryStrong} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {inviteFeedback ? <StatusNotice tone="error" message={inviteFeedback} /> : null}

                  {invitesQuery.data.canGenerate ? (
                    <Pressable
                      onPress={() => inviteMutation.mutate()}
                      disabled={inviteMutation.isPending}
                      style={[styles.primaryButton, inviteMutation.isPending ? styles.buttonDisabled : null]}
                    >
                      {inviteMutation.isPending ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={styles.primaryButtonText}>
                          {activeInvites.length > 0 ? 'gerar outro convite' : 'gerar convite'}
                        </Text>
                      )}
                    </Pressable>
                  ) : activeInvites.length === 0 ? (
                    <Text style={styles.muted}>você atingiu o limite de convites deste mês.</Text>
                  ) : null}
                </>
              )}
            </View>

            {/* ============= Zona perigosa ============= */}
            <View style={[styles.card, styles.dangerCard]}>
              <Text style={styles.dangerTitle}>zona perigosa</Text>
              <Text style={styles.muted}>
                excluir sua conta é uma ação permanente. seus posts, depos e comunidades serão desvinculados do seu perfil.
              </Text>
              <Pressable onPress={() => setDeleteOpen(true)} style={styles.dangerButton}>
                <Ionicons name="trash-outline" size={18} color={colors.white} />
                <Text style={styles.dangerButtonText}>excluir minha conta</Text>
              </Pressable>
            </View>

            {/* ============= Rodapé de versão (diagnóstico) ============= */}
            <View style={styles.versionFooter}>
              <Text style={styles.versionLine}>v{appVersion} · canal: {channel}</Text>
              <Text style={styles.versionLine}>OTA: {otaInfo}</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={closeDeleteModal} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>excluir conta?</Text>
            <Text style={styles.confirmText}>
              esta ação é permanente. digite <Text style={styles.confirmWord}>EXCLUIR</Text> abaixo para confirmar.
            </Text>

            <TextInput
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder="EXCLUIR"
              placeholderTextColor={colors.textSoft}
              style={styles.input}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            {deleteError ? <StatusNotice tone="error" message={deleteError} /> : null}

            <View style={styles.confirmActions}>
              <Pressable onPress={closeDeleteModal} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleteMutation.isPending}
                style={[styles.confirmDanger, deleteMutation.isPending ? styles.buttonDisabled : null]}
              >
                {deleteMutation.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmDangerText}>excluir definitivamente</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerAction: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 48 },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.16)',
    backgroundColor: 'rgba(10, 12, 28, 0.88)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  label: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.7)',
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  eyeButton: {
    paddingLeft: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  errorText: { color: colors.error, fontSize: 14 },
  codeBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.28)',
    backgroundColor: 'rgba(143, 70, 255, 0.08)',
    padding: spacing.sm,
    gap: 4,
  },
  codeLabel: { color: colors.textMuted, fontSize: 12 },
  code: { color: colors.text, fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  shareIconButton: { padding: spacing.xs },
  dangerCard: {
    borderColor: 'rgba(255, 70, 102, 0.32)',
  },
  dangerTitle: { color: '#ff4666', fontSize: 17, fontWeight: '700' },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: '#ff4666',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  dangerButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 102, 0.32)',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmTitle: { color: colors.text, fontSize: 19, fontWeight: '700' },
  confirmText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  confirmWord: { color: '#ff4666', fontWeight: '700' },
  confirmActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end', marginTop: spacing.xs },
  confirmCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmCancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  confirmDanger: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#ff4666',
  },
  confirmDangerText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  versionFooter: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 2,
  },
  versionLine: {
    color: colors.textSoft,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
