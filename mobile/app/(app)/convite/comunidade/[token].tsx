import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type CommunityInvite } from '../../../../components/post/CommunityInviteCard';
import { getMediaUri } from '../../../../components/profile/profile-utils';
import { AppBackground } from '../../../../components/ui/AppBackground';
import { StatusNotice } from '../../../../components/ui/StatusNotice';
import { colors, radius, spacing } from '../../../../components/ui/theme';
import { ApiClientError, api } from '../../../../lib/api/client';

type AcceptInviteResponse = {
  ok: boolean;
  joinedNow: boolean;
  community: CommunityInvite['community'];
};

function openCommunity(community: CommunityInvite['community']) {
  router.replace({
    pathname: '/comunidade/[slug]',
    params: {
      slug: community.slug,
      communityId: community.id,
      name: community.name,
      coverImageUrl: community.coverImageUrl ?? '',
      memberCount: String(community.memberCount),
      description: community.description ?? '',
    },
  });
}

export default function CommunityInviteScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const queryClient = useQueryClient();

  const inviteQuery = useQuery({
    queryKey: ['community-invite', token],
    queryFn: () => api<CommunityInvite>(`/api/community-invites/${token}`),
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: () => api<AcceptInviteResponse>(`/api/community-invites/${token}/accept`, { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['community-invite', token] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community-feed', data.community.id] });
      openCommunity(data.community);
    },
  });

  const invite = inviteQuery.data;
  const coverUri = getMediaUri(invite?.community.coverImageUrl ?? null);
  const isAvailable = invite?.status === 'active';
  const canAccept = !!invite && !invite.isMember && isAvailable;

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.headerAction}>voltar</Text>
            </Pressable>
            <Text style={styles.headerTitle}>convite</Text>
            <View style={styles.headerSpacer} />
          </View>

          {!token ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>convite invalido</Text>
              <Text style={styles.stateText}>nao encontramos o codigo desse convite.</Text>
            </View>
          ) : inviteQuery.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>carregando convite...</Text>
            </View>
          ) : inviteQuery.isError || !invite ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>convite indisponivel</Text>
              <Text style={styles.stateText}>
                {inviteQuery.error instanceof ApiClientError
                  ? inviteQuery.error.message.toLowerCase()
                  : 'tente de novo em instantes.'}
              </Text>
            </View>
          ) : (
            <View style={styles.inviteCard}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" transition={200} alt="" />
              ) : (
                <View style={[styles.cover, styles.coverFallback]}>
                  <Text style={styles.coverFallbackText}>#{invite.community.slug.slice(0, 2)}</Text>
                </View>
              )}

              <View style={styles.copy}>
                <Text style={styles.kicker}>convite de comunidade</Text>
                <Text style={styles.title}>{invite.community.name.toLowerCase()}</Text>
                {invite.community.description ? (
                  <Text style={styles.description}>{invite.community.description}</Text>
                ) : null}
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={17} color={colors.textMuted} />
                  <Text style={styles.metaText}>
                    {invite.community.memberCount} {invite.community.memberCount === 1 ? 'membro' : 'membros'}
                  </Text>
                </View>
              </View>

              {invite.status !== 'active' ? (
                <StatusNotice
                  tone="error"
                  message={
                    invite.status === 'expired'
                      ? 'esse convite expirou.'
                      : invite.status === 'revoked'
                        ? 'esse convite foi encerrado.'
                        : 'esse convite atingiu o limite de usos.'
                  }
                />
              ) : null}

              {acceptMutation.error instanceof ApiClientError ? (
                <StatusNotice tone="error" message={acceptMutation.error.message.toLowerCase()} />
              ) : null}

              <Pressable
                disabled={!invite.isMember && !canAccept || acceptMutation.isPending}
                onPress={() => {
                  if (invite.isMember) {
                    openCommunity(invite.community);
                    return;
                  }
                  acceptMutation.mutate();
                }}
                style={[
                  styles.primaryButton,
                  !invite.isMember && !canAccept ? styles.primaryButtonDisabled : null,
                ]}
              >
                {acceptMutation.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {invite.isMember
                      ? 'abrir comunidade'
                      : `entrar na comunidade ${invite.community.name.toLowerCase()}`}
                  </Text>
                )}
              </Pressable>
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerAction: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  headerSpacer: { width: 48 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingBottom: 80 },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  inviteCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.34)',
    backgroundColor: 'rgba(10, 12, 28, 0.9)',
    padding: spacing.md,
    gap: spacing.md,
  },
  cover: {
    width: '100%',
    height: 170,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  coverFallbackText: { color: colors.textMuted, fontSize: 34, fontWeight: '800' },
  copy: { gap: spacing.xs },
  kicker: { color: colors.accentBlue, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: colors.textMuted, fontSize: 14 },
  primaryButton: {
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: '800' },
});
