import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiClientError, api } from '../../lib/api/client';
import { getMediaUri } from '../profile/profile-utils';
import { colors, radius, spacing } from '../ui/theme';

export type CommunityInvite = {
  token: string;
  url: string;
  status: 'active' | 'expired' | 'revoked' | 'full';
  isMember: boolean;
  createdBy: {
    id: string;
    username: string;
  };
  community: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    coverImageUrl: string | null;
    memberCount: number;
    postCount: number;
  };
};

type AcceptInviteResponse = {
  ok: boolean;
  joinedNow: boolean;
  community: CommunityInvite['community'];
};

type CommunityInviteCardProps = {
  token: string;
  compact?: boolean;
};

function openCommunity(community: CommunityInvite['community']) {
  router.push({
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

export function CommunityInviteCard({ token, compact = false }: CommunityInviteCardProps) {
  const queryClient = useQueryClient();
  const inviteQuery = useQuery({
    queryKey: ['community-invite', token],
    queryFn: () => api<CommunityInvite>(`/api/community-invites/${token}`),
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

  if (inviteQuery.isLoading) {
    return (
      <View style={[styles.card, compact ? styles.cardCompact : null]}>
        <ActivityIndicator color={colors.primaryStrong} />
        <Text style={styles.muted}>carregando convite...</Text>
      </View>
    );
  }

  if (inviteQuery.isError || !inviteQuery.data) {
    const message = inviteQuery.error instanceof ApiClientError
      ? inviteQuery.error.message.toLowerCase()
      : 'convite indisponivel.';

    return (
      <View style={[styles.card, styles.unavailableCard, compact ? styles.cardCompact : null]}>
        <Ionicons name="alert-circle-outline" size={20} color={colors.textMuted} />
        <Text style={styles.muted}>{message}</Text>
      </View>
    );
  }

  const invite = inviteQuery.data;
  const coverUri = getMediaUri(invite.community.coverImageUrl);
  const isAvailable = invite.status === 'active';
  const actionLabel = invite.isMember ? 'abrir comunidade' : isAvailable ? 'entrar' : 'indisponivel';
  const statusLabel =
    invite.status === 'expired'
      ? 'convite expirado'
      : invite.status === 'revoked'
        ? 'convite encerrado'
        : invite.status === 'full'
          ? 'limite atingido'
          : `${invite.community.memberCount} ${invite.community.memberCount === 1 ? 'membro' : 'membros'}`;

  const handlePress = () => {
    if (invite.isMember) {
      openCommunity(invite.community);
      return;
    }
    if (isAvailable && !acceptMutation.isPending) {
      acceptMutation.mutate();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!invite.isMember && !isAvailable}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.cardCompact : null,
        pressed && (invite.isMember || isAvailable) ? styles.cardPressed : null,
        !invite.isMember && !isAvailable ? styles.cardDisabled : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`convite para ${invite.community.name}`}
    >
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" transition={200} alt="" />
      ) : (
        <View style={[styles.cover, styles.coverFallback]}>
          <Text style={styles.coverFallbackText}>#{invite.community.slug.slice(0, 2)}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.kicker}>convite de comunidade</Text>
        <Text style={styles.title} numberOfLines={2}>
          {invite.community.name.toLowerCase()}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {statusLabel}
        </Text>
      </View>

      <View style={[styles.action, invite.isMember || isAvailable ? styles.actionAvailable : styles.actionMuted]}>
        {acceptMutation.isPending ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <>
            <Ionicons
              name={invite.isMember ? 'arrow-forward' : 'person-add-outline'}
              size={16}
              color={invite.isMember || isAvailable ? colors.white : colors.textSoft}
            />
            <Text style={[styles.actionText, invite.isMember || isAvailable ? styles.actionTextAvailable : null]}>
              {actionLabel}
            </Text>
          </>
        )}
      </View>

      {acceptMutation.error instanceof ApiClientError ? (
        <Text style={styles.errorText}>{acceptMutation.error.message.toLowerCase()}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.34)',
    backgroundColor: 'rgba(13, 35, 55, 0.72)',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  cardCompact: {
    padding: spacing.xs,
  },
  unavailableCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPressed: {
    opacity: 0.94,
  },
  cardDisabled: {
    opacity: 0.7,
  },
  cover: {
    width: '100%',
    height: 92,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverFallbackText: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    gap: 3,
  },
  kicker: {
    color: colors.accentBlue,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  action: {
    minHeight: 38,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  actionAvailable: {
    backgroundColor: colors.accentBlue,
  },
  actionMuted: {
    backgroundColor: colors.surfaceSoft,
  },
  actionText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '800',
  },
  actionTextAvailable: {
    color: colors.white,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
  },
});
