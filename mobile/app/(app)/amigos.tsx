import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ProfileAvatar } from '../../components/profile/ProfileAvatar';
import { AppBackground } from '../../components/ui/AppBackground';
import { StatusNotice } from '../../components/ui/StatusNotice';
import { colors, radius, spacing } from '../../components/ui/theme';
import { ApiClientError, api } from '../../lib/api/client';
import {
  friendsQueryKey,
  userFriendsQueryKey,
  type FriendsResponse,
  type ProfileResponse,
} from '../../components/profile/types';
import { getPresenceMeta } from '../../components/profile/profile-utils';
import { useAuth } from '../../lib/auth/context';

type Friend = FriendsResponse['friends'][number];
type ProfileCommunitiesResponse = {
  communities: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

type FetchFriendsParams = {
  isVisitor: boolean;
  visitedUsername: string | null;
  currentUsername: string | null;
};

async function fetchFriendsScreenData({ isVisitor, visitedUsername, currentUsername }: FetchFriendsParams): Promise<FriendsResponse> {
  const friendsResponse = await api<FriendsResponse>(
    isVisitor ? `/api/profile/${encodeURIComponent(visitedUsername ?? '')}/friends` : '/api/friends'
  );
  const baseFriends = friendsResponse.friends ?? [];

  if (!currentUsername || baseFriends.length === 0) {
    return friendsResponse;
  }

  const [myCommunities, profiles, friendCommunities] = await Promise.all([
    api<ProfileCommunitiesResponse>(`/api/profile/${encodeURIComponent(currentUsername)}/communities?page=1&limit=100`),
    Promise.all(
      baseFriends.map((friend) =>
        api<ProfileResponse>(`/api/profile/${encodeURIComponent(friend.username)}`).catch(() => null)
      )
    ),
    Promise.all(
      baseFriends.map((friend) =>
        api<ProfileCommunitiesResponse>(`/api/profile/${encodeURIComponent(friend.username)}/communities?page=1&limit=100`).catch(
          () => ({ communities: [] })
        )
      )
    ),
  ]);

  const myCommunityIds = new Set(myCommunities.communities.map((community) => community.id));
  const friends = baseFriends.map((friend, index) => {
    const profile = profiles[index];
    const profileUser = profile?.user;
    const fallbackCommonCommunities = friendCommunities[index].communities.filter((community) =>
      myCommunityIds.has(community.id)
    );

    return {
      ...friend,
      friendshipId:
        friend.friendshipId ??
        (profile?.friendState.type === 'friends' ? profile.friendState.id : undefined),
      city: friend.city ?? profileUser?.city ?? null,
      state: friend.state ?? profileUser?.state ?? null,
      statusText: friend.statusText ?? profileUser?.statusText ?? null,
      profilePhrase: friend.profilePhrase ?? profileUser?.profilePhrase ?? null,
      bio: friend.bio ?? profileUser?.bio ?? null,
      commonCommunities:
        friend.commonCommunities && friend.commonCommunities.length > 0
          ? friend.commonCommunities
          : fallbackCommonCommunities,
    };
  });

  return { ...friendsResponse, friends };
}

export default function AmigosScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ username?: string }>();
  const visitedUsername = typeof params.username === 'string' && params.username.length > 0 ? params.username : null;
  const isVisitor = visitedUsername !== null;

  const friendsQuery = useQuery({
    queryKey: isVisitor
      ? [...userFriendsQueryKey(visitedUsername!), 'enriched', user?.username]
      : [...friendsQueryKey, 'enriched', user?.username],
    enabled: !isVisitor || !!visitedUsername,
    queryFn: () =>
      fetchFriendsScreenData({
        isVisitor,
        visitedUsername,
        currentUsername: user?.username ?? null,
      }),
  });

  const [confirmTarget, setConfirmTarget] = useState<Friend | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const removeMutation = useMutation({
    mutationFn: async (friendshipId: string) =>
      api(`/api/friends/${friendshipId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setConfirmTarget(null);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: friendsQueryKey });
    },
    onError: (error) => {
      setActionError(
        error instanceof ApiClientError ? error.message.toLowerCase() : 'não foi possível desfazer a amizade.'
      );
    },
  });

  const closeConfirm = () => {
    setConfirmTarget(null);
    setActionError(null);
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.backText}>voltar</Text>
            </Pressable>
            <Text style={styles.title} numberOfLines={1}>
              {isVisitor ? `amigos de @${visitedUsername}` : 'amigos'}
            </Text>
            <View style={styles.spacer} />
          </View>

          {friendsQuery.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>carregando amizades…</Text>
            </View>
          ) : friendsQuery.isError ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>
                {isVisitor ? 'não foi possível carregar a lista de amigos' : 'não foi possível carregar seus amigos'}
              </Text>
              <Text style={styles.stateText}>
                {friendsQuery.error instanceof ApiClientError
                  ? friendsQuery.error.message.toLowerCase()
                  : 'tente novamente em instantes.'}
              </Text>
            </View>
          ) : (
            <FlashList
              data={friendsQuery.data?.friends ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <FriendCard
                  friend={item}
                  onRemove={isVisitor ? null : () => setConfirmTarget(item)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <Text style={styles.stateTitle}>
                    {isVisitor ? 'a rede dessa pessoa ainda está pequena' : 'sua rede ainda está pequena'}
                  </Text>
                  <Text style={styles.stateText}>
                    {isVisitor
                      ? 'quando novas amizades aparecerem, elas vão estar aqui.'
                      : 'quando suas amizades entrarem, elas aparecem aqui.'}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>

      <Modal visible={!isVisitor && !!confirmTarget} transparent animationType="fade" onRequestClose={closeConfirm} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>desfazer amizade?</Text>
            <Text style={styles.confirmText}>
              você e <Text style={styles.confirmStrong}>@{confirmTarget?.username}</Text> não serão mais amigos. essa ação pode ser refeita enviando um novo pedido.
            </Text>

            {actionError ? <StatusNotice tone="error" message={actionError} /> : null}

            <View style={styles.confirmActions}>
              <Pressable onPress={closeConfirm} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (confirmTarget?.friendshipId) {
                    removeMutation.mutate(confirmTarget.friendshipId);
                  }
                }}
                disabled={removeMutation.isPending || !confirmTarget?.friendshipId}
                style={[
                  styles.confirmDanger,
                  removeMutation.isPending || !confirmTarget?.friendshipId ? styles.buttonDisabled : null,
                ]}
              >
                {removeMutation.isPending ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmDangerText}>desfazer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppBackground>
  );
}

function FriendCard({ friend, onRemove }: { friend: Friend; onRemove: (() => void) | null }) {
  const presence = getPresenceMeta(friend.presenceStatus ?? 'offline');
  const location = [friend.city, friend.state].filter(Boolean).join(', ');
  const tagline = friend.statusText ?? friend.profilePhrase ?? friend.bio ?? null;
  const commonCommunities = friend.commonCommunities ?? [];
  const canRemove = onRemove !== null && !!friend.friendshipId;

  return (
    <View style={styles.friendCard}>
      <View style={styles.friendTop}>
        <View style={[styles.avatarRing, { borderColor: presence.color }]}>
          <ProfileAvatar username={friend.username} imageUrl={friend.profileImageUrl} size={56} />
        </View>
        <View style={styles.friendMeta}>
          <Text style={styles.friendName}>@{friend.username}</Text>
          <View style={styles.presenceRow}>
            <View style={[styles.presenceDot, { backgroundColor: presence.color }]} />
            <Text style={styles.presenceText}>{presence.label}</Text>
          </View>
          {location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {tagline ? <Text style={styles.statusText}>{tagline}</Text> : null}

      <View style={styles.commonSection}>
        {commonCommunities.length > 0 ? (
          <>
            <Text style={styles.commonLabel}>comunidades em comum</Text>
            <View style={styles.communityChips}>
              {commonCommunities.slice(0, 3).map((community) => (
                <View key={community.id ?? community.slug} style={styles.communityChip}>
                  <Text style={styles.communityChipText} numberOfLines={1}>
                    {community.name.toLowerCase()}
                  </Text>
                </View>
              ))}
              {commonCommunities.length > 3 ? (
                <View style={styles.communityChip}>
                  <Text style={styles.communityChipText}>+{commonCommunities.length - 3}</Text>
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.commonEmpty}>nenhuma comunidade em comum</Text>
        )}
      </View>

      <View style={styles.friendActions}>
        <Pressable
          onPress={() => router.push(`/usuario/${friend.username}`)}
          style={styles.secondaryButton}
        >
          <Ionicons name="person-outline" size={16} color={colors.text} />
          <Text style={styles.secondaryButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
            ver perfil
          </Text>
        </Pressable>
        {canRemove ? (
          <Pressable onPress={onRemove} style={styles.dangerButton}>
            <Ionicons name="person-remove-outline" size={16} color="#ff4666" />
            <Text style={styles.dangerButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              desfazer amizade
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
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
  listContent: { paddingBottom: 120 },

  friendCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.16)',
    backgroundColor: 'rgba(10, 12, 28, 0.88)',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  friendTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarRing: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2.5,
  },
  friendMeta: { flex: 1, gap: 4 },
  friendName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  presenceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  presenceDot: { width: 8, height: 8, borderRadius: radius.pill },
  presenceText: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', fontWeight: '700', letterSpacing: 0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: colors.textMuted, fontSize: 13 },

  statusText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    paddingLeft: 4,
  },

  commonSection: { gap: 6 },
  commonLabel: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commonEmpty: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  communityChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  communityChip: {
    maxWidth: '100%',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(49, 213, 222, 0.24)',
    backgroundColor: 'rgba(49, 213, 222, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  communityChipText: { color: colors.accentBlue, fontSize: 12, fontWeight: '700' },

  friendActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  secondaryButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
  },
  secondaryButtonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  dangerButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 150,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 102, 0.4)',
    backgroundColor: 'rgba(255, 70, 102, 0.08)',
    paddingHorizontal: spacing.sm,
  },
  dangerButtonText: { color: '#ff4666', fontSize: 13, fontWeight: '700' },

  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  stateTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 102, 0.32)',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  confirmTitle: { color: colors.text, fontSize: 19, fontWeight: '700' },
  confirmText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  confirmStrong: { color: colors.text, fontWeight: '700' },
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
  buttonDisabled: { opacity: 0.5 },
});
