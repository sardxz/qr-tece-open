import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileAvatar } from '../../components/profile/ProfileAvatar';
import { formatProfileDate } from '../../components/profile/profile-utils';
import { activityQueryKey, profileQueryKey, receivedDeposQueryKey, type ReceivedDeposResponse } from '../../components/profile/types';
import { AppBackground } from '../../components/ui/AppBackground';
import { colors, radius, spacing } from '../../components/ui/theme';
import { useAuth } from '../../lib/auth/context';
import { ApiClientError, api } from '../../lib/api/client';
import { linkifyNative } from '../../components/post/Linkify';

type DepoItem = ReceivedDeposResponse['pending'][number];

export default function DeposRecebidosScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const deposQuery = useQuery({
    queryKey: receivedDeposQueryKey,
    queryFn: () => api<ReceivedDeposResponse>('/api/depos/recebidos?limit=50'),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' | 'delete' }) => {
      if (action === 'delete') {
        return api(`/api/depos/${id}`, { method: 'DELETE' });
      }
      return api(`/api/depos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: receivedDeposQueryKey });
      queryClient.invalidateQueries({ queryKey: activityQueryKey });
      if (user?.username) {
        queryClient.invalidateQueries({ queryKey: profileQueryKey(user.username) });
      }
    },
  });

  const renderDepo = ({ item, pending }: { item: DepoItem; pending: boolean }) => (
    <View style={styles.depoCard}>
      <View style={styles.depoHeader}>
        <ProfileAvatar username={item.author.username} imageUrl={item.author.profileImageUrl} size={44} />
        <View style={styles.depoMeta}>
          <Text style={styles.depoAuthor}>@{item.author.username}</Text>
          <Text style={styles.depoDate}>
            {formatProfileDate(pending ? item.createdAt : item.approvedAt ?? item.createdAt)}
          </Text>
        </View>
      </View>
      <Text style={styles.depoContent}>{linkifyNative(item.content)}</Text>

      <View style={styles.actionsRow}>
        {pending ? (
          <>
            <Pressable
              onPress={() => actionMutation.mutate({ id: item.id, action: 'approve' })}
              style={styles.acceptButton}
            >
              <Text style={styles.acceptText}>Aprovar</Text>
            </Pressable>
            <Pressable
              onPress={() => actionMutation.mutate({ id: item.id, action: 'reject' })}
              style={styles.rejectButton}
            >
              <Text style={styles.rejectText}>Recusar</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => actionMutation.mutate({ id: item.id, action: 'delete' })}
            style={styles.rejectButton}
          >
            <Text style={styles.rejectText}>Apagar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
            <Text style={styles.title}>Depos recebidos</Text>
            <View style={styles.spacer} />
          </View>

          {deposQuery.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>Carregando seus depos…</Text>
            </View>
          ) : deposQuery.isError ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>Não foi possível carregar os depos</Text>
              <Text style={styles.stateText}>
                {deposQuery.error instanceof ApiClientError ? deposQuery.error.message : 'Tente novamente em instantes.'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              <View style={styles.listHeader}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Revisão de depos</Text>
                  <Text style={styles.summaryText}>
                    {deposQuery.data?.pending.length ?? 0} pendente{(deposQuery.data?.pending.length ?? 0) === 1 ? '' : 's'} ·{' '}
                    {deposQuery.data?.approved.length ?? 0} aprovado{(deposQuery.data?.approved.length ?? 0) === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>

              {(deposQuery.data?.pending.length ?? 0) === 0 && (deposQuery.data?.approved.length ?? 0) === 0 ? (
                <View style={styles.centerState}>
                  <Text style={styles.stateTitle}>Nenhum depo recebido</Text>
                  <Text style={styles.stateText}>Quando alguém escrever para você no qr.tecê, aparece aqui.</Text>
                </View>
              ) : (
                <>
                  {(deposQuery.data?.pending.length ?? 0) > 0 ? <Text style={styles.sectionTitle}>Pendentes</Text> : null}
                  {(deposQuery.data?.pending ?? []).map((item) => (
                    <View key={`pending-${item.id}`}>{renderDepo({ item, pending: true })}</View>
                  ))}

                  {(deposQuery.data?.approved.length ?? 0) > 0 ? <Text style={styles.sectionTitle}>Aprovados</Text> : null}
                  {(deposQuery.data?.approved ?? []).map((item) => (
                    <View key={`approved-${item.id}`}>{renderDepo({ item, pending: false })}</View>
                  ))}
                </>
              )}

              {actionMutation.isPending ? (
                <View style={styles.footerState}>
                  <ActivityIndicator color={colors.primaryStrong} />
                </View>
              ) : null}
              {actionMutation.error instanceof ApiClientError ? (
                <Text style={styles.errorText}>{actionMutation.error.message}</Text>
              ) : null}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  backText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  spacer: { width: 48 },
  listContent: { paddingBottom: 120, gap: spacing.md },
  listHeader: { gap: spacing.md, paddingBottom: spacing.md },
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.18)',
    backgroundColor: 'rgba(10, 12, 28, 0.88)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  summaryText: { color: colors.textMuted, fontSize: 14 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  depoCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  depoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  depoMeta: { gap: 4 },
  depoAuthor: { color: colors.text, fontSize: 15, fontWeight: '700' },
  depoDate: { color: colors.textSoft, fontSize: 12 },
  depoContent: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  acceptButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  rejectButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  footerState: { paddingVertical: spacing.sm },
  errorText: { color: colors.error, fontSize: 13, paddingTop: spacing.sm },
});
