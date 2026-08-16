import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PostCard } from '../../../components/post/PostCard';
import { type PostsPage } from '../../../components/post/types';
import { getMediaUri } from '../../../components/profile/profile-utils';
import { CommunityOwnerMenu } from '../../../components/community/CommunityOwnerMenu';
import { AppBackground } from '../../../components/ui/AppBackground';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { colors, radius, spacing } from '../../../components/ui/theme';
import { api, ApiClientError } from '../../../lib/api/client';
import { useAuth } from '../../../lib/auth/context';
import { communityViewsQueryKey, markCommunityViewed } from '../../../lib/storage/community-views';

type CommunityDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  rules: string | null;
  coverImageUrl: string | null;
  isPrivate: boolean;
  memberCount: number;
  postCount: number;
  isMember: boolean;
  notifyNewPosts: boolean | null;
  myRole: 'OWNER' | 'MOD' | 'MEMBER' | null;
  createdBy: {
    id: string;
    username: string;
  };
};

type CommunityNotificationsResponse = {
  notifyNewPosts: boolean;
};

type LeaveCommunityResponse = {
  ok: boolean;
};

async function fetchCommunityFeed(communityId: string, cursor: string | null) {
  const query = new URLSearchParams({ communityId });
  if (cursor) query.set('cursor', cursor);
  return api<PostsPage>(`/api/posts?${query.toString()}`);
}

export default function ComunidadeDetailScreen() {
  const params = useLocalSearchParams<{
    slug?: string;
    communityId?: string;
    name?: string;
    coverImageUrl?: string;
    memberCount?: string;
    description?: string;
  }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const menuButtonRef = useRef<View>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const fallbackName = Array.isArray(params.name) ? params.name[0] : params.name;
  const communityId = Array.isArray(params.communityId) ? params.communityId[0] : params.communityId;
  const fallbackCoverImageUrl = Array.isArray(params.coverImageUrl) ? params.coverImageUrl[0] : params.coverImageUrl;
  const fallbackDescription = Array.isArray(params.description) ? params.description[0] : params.description;
  const fallbackMemberCountParam = Array.isArray(params.memberCount) ? params.memberCount[0] : params.memberCount;
  const fallbackMemberCount = fallbackMemberCountParam ? Number(fallbackMemberCountParam) : null;
  const communityDetailQueryKey = ['community-detail', slug] as const;

  const communityQuery = useQuery({
    queryKey: communityDetailQueryKey,
    queryFn: () => api<CommunityDetail>(`/api/communities/${slug}`),
    enabled: !!slug,
  });

  const community = communityQuery.data;
  const effectiveCommunityId = community?.id ?? communityId;
  const hasCommunityTarget = !!effectiveCommunityId;
  const isMember = community?.isMember === true;
  const isPrivate = community?.isPrivate === true;
  const isPrivateNonMember = isPrivate && !isMember;

  useEffect(() => {
    if (!effectiveCommunityId) return;
    markCommunityViewed(effectiveCommunityId).then(() => {
      queryClient.invalidateQueries({ queryKey: communityViewsQueryKey });
    });
  }, [effectiveCommunityId, queryClient]);

  const feedQuery = useInfiniteQuery({
    queryKey: ['community-feed', effectiveCommunityId],
    enabled: !!effectiveCommunityId && isMember,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchCommunityFeed(effectiveCommunityId as string, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const joinMutation = useMutation({
    mutationFn: () => api(`/api/communities/${slug}/join`, { method: 'POST' }),
    onSuccess: async () => {
      await communityQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['profile', user?.username, 'communities'] });
      if (effectiveCommunityId) {
        queryClient.invalidateQueries({ queryKey: ['community-feed', effectiveCommunityId] });
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: () => api<{ url: string }>(`/api/communities/${slug}/invites`, { method: 'POST' }),
    onSuccess: async (data) => {
      await Share.share({ message: `entre na comunidade ${community?.name ?? fallbackName ?? 'comunidade'}: ${data.url}`, url: data.url });
    },
  });

  const notificationsMutation = useMutation({
    mutationFn: (notifyNewPosts: boolean) =>
      api<CommunityNotificationsResponse>(`/api/communities/${slug}/notifications`, {
        method: 'PATCH',
        body: JSON.stringify({ notifyNewPosts }),
      }),
    onMutate: async (notifyNewPosts) => {
      await queryClient.cancelQueries({ queryKey: communityDetailQueryKey });
      const previousCommunity = queryClient.getQueryData<CommunityDetail>(communityDetailQueryKey);

      queryClient.setQueryData<CommunityDetail>(communityDetailQueryKey, (current) =>
        current ? { ...current, notifyNewPosts } : current
      );

      return { previousCommunity };
    },
    onError: (_error, _notifyNewPosts, context) => {
      if (context?.previousCommunity) {
        queryClient.setQueryData(communityDetailQueryKey, context.previousCommunity);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CommunityDetail>(communityDetailQueryKey, (current) =>
        current ? { ...current, notifyNewPosts: data.notifyNewPosts } : current
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityDetailQueryKey });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api<LeaveCommunityResponse>(`/api/communities/${slug}/join`, { method: 'DELETE' }),
    onSuccess: () => {
      setMenuVisible(false);
      queryClient.invalidateQueries({ queryKey: communityDetailQueryKey });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.username, 'communities'] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.username, 'communities', 'feed-strip'] });
      if (effectiveCommunityId) {
        queryClient.invalidateQueries({ queryKey: ['community-feed', effectiveCommunityId] });
        queryClient.invalidateQueries({ queryKey: ['community-strip', effectiveCommunityId] });
      }
      router.replace('/(app)/(tabs)/comus');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: communityDetailQueryKey });
    },
  });

  const posts = feedQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  const displayName = community?.name ?? fallbackName ?? 'comunidade';
  const coverUri = getMediaUri(community?.coverImageUrl ?? fallbackCoverImageUrl ?? null);
  const description = community?.description ?? fallbackDescription ?? null;
  const memberCount = community?.memberCount ?? (Number.isFinite(fallbackMemberCount) ? fallbackMemberCount : null);
  const isOwner = community?.myRole === 'OWNER' || community?.createdBy.id === user?.id;
  const isLoading = communityQuery.isLoading || (isMember && feedQuery.isLoading && !feedQuery.data);
  const loadError = isMember ? feedQuery.error : null;
  const joinError =
    joinMutation.error instanceof ApiClientError
      ? joinMutation.error.message.toLowerCase()
      : joinMutation.error instanceof Error
        ? joinMutation.error.message.toLowerCase()
        : null;
  const inviteError =
    inviteMutation.error instanceof ApiClientError
      ? inviteMutation.error.message.toLowerCase()
      : inviteMutation.error instanceof Error
        ? inviteMutation.error.message.toLowerCase()
        : null;
  const notificationsError =
    notificationsMutation.error instanceof ApiClientError
      ? notificationsMutation.error.message.toLowerCase()
      : notificationsMutation.error instanceof Error
        ? notificationsMutation.error.message.toLowerCase()
        : null;
  const leaveError =
    leaveMutation.error instanceof ApiClientError
      ? leaveMutation.error.message.toLowerCase()
      : leaveMutation.error instanceof Error
        ? leaveMutation.error.message.toLowerCase()
        : null;

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      const safeInset = spacing.lg;
      const menuWidth = Math.min(300, screenWidth - safeInset * 2);
      const measuredRight = screenWidth - (x + width);
      const right = Math.max(safeInset, Math.min(measuredRight, screenWidth - safeInset - menuWidth));
      setMenuAnchor({ top: y + height + 6, right });
      setMenuVisible(true);
    });
  };

  const handleToggleNotifications = () => {
    if (community?.notifyNewPosts === null || community?.notifyNewPosts === undefined || notificationsMutation.isPending) {
      return;
    }
    notificationsMutation.mutate(!community.notifyNewPosts);
  };

  const confirmLeaveCommunity = () => {
    setMenuVisible(false);
    Alert.alert(
      'Sair da comunidade?',
      'Voce deixara de ver os posts desta comu na sua lista.',
      [
        { text: 'cancelar', style: 'cancel' },
        { text: 'sair', style: 'destructive', onPress: () => leaveMutation.mutate() },
      ]
    );
  };

  const Header = (
    <View style={styles.header}>
      <View style={styles.coverWrap}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" transition={200} alt="" />
        ) : (
          <View style={[styles.cover, styles.coverFallback]}>
            <Text style={styles.coverFallbackLabel}>#{(slug ?? '').slice(0, 2)}</Text>
          </View>
        )}
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{displayName}</Text>
        <View style={styles.titleActions}>
          {isOwner && slug && community ? (
            <CommunityOwnerMenu
              slug={slug}
              community={{ name: community.name, description: community.description, rules: community.rules }}
              canInvite={isPrivate && community.myRole === 'OWNER'}
              onUpdated={() => communityQuery.refetch()}
              onDeleted={() => router.replace('/(app)/(tabs)/comus')}
            />
          ) : null}
          {community?.notifyNewPosts !== null && community?.notifyNewPosts !== undefined ? (
            <Pressable
              ref={menuButtonRef}
              onPress={openMenu}
              hitSlop={8}
              style={styles.kebabButton}
              accessibilityLabel="opcoes da comunidade"
            >
              <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="people-outline" size={16} color={colors.textMuted} />
        <Text style={styles.metaText}>
          {memberCount === null ? 'membros' : `${memberCount} ${memberCount === 1 ? 'membro' : 'membros'}`}
        </Text>
      </View>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      {isPrivateNonMember ? (
        <View style={styles.closedBox}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <Text style={styles.closedText}>comunidade fechada: acesso so por convite</Text>
        </View>
      ) : !isMember && slug ? (
        <Pressable
          onPress={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          style={[styles.joinButton, joinMutation.isPending ? styles.joinButtonDisabled : null]}
          accessibilityLabel="entrar na comunidade"
        >
          {joinMutation.isPending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <Text style={styles.joinButtonText}>Entrar</Text>
          )}
        </Pressable>
      ) : null}

      {isPrivate && isMember && community?.myRole === 'OWNER' ? (
        <Pressable
          onPress={() => inviteMutation.mutate()}
          disabled={inviteMutation.isPending}
          style={[styles.inviteButton, inviteMutation.isPending ? styles.joinButtonDisabled : null]}
          accessibilityLabel="compartilhar convite da comunidade"
        >
          {inviteMutation.isPending ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              <Ionicons name="share-social-outline" size={18} color={colors.text} />
              <Text style={styles.inviteButtonText}>compartilhar convite</Text>
            </>
          )}
        </Pressable>
      ) : null}

      {joinError ? <StatusNotice tone="error" message={joinError} /> : null}
      {inviteError ? <StatusNotice tone="error" message={inviteError} /> : null}
      {notificationsError ? <StatusNotice tone="error" message={notificationsError} /> : null}
      {leaveError ? <StatusNotice tone="error" message={leaveError} /> : null}
    </View>
  );

  const handleCreatePost = () => {
    if (!effectiveCommunityId) return;
    router.push({
      pathname: '/criar',
      params: { communityId: effectiveCommunityId, communityName: community?.name ?? fallbackName ?? '' },
    });
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>carregando publicações...</Text>
            </View>
          ) : !hasCommunityTarget ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>comunidade invalida</Text>
              <Text style={styles.stateText}>nao encontramos o identificador desta comunidade.</Text>
            </View>
          ) : loadError ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>não foi possível carregar</Text>
              <Text style={styles.stateText}>
                {loadError instanceof ApiClientError ? loadError.message.toLowerCase() : 'tente novamente em instantes.'}
              </Text>
            </View>
          ) : !isMember ? (
            <ScrollView
              contentContainerStyle={styles.memberGateContent}
              refreshControl={
                <RefreshControl
                  tintColor={colors.primaryStrong}
                  colors={[colors.primaryStrong]}
                  refreshing={communityQuery.isRefetching}
                  onRefresh={() => communityQuery.refetch()}
                />
              }
            >
              {Header}
            </ScrollView>
          ) : (
            <FlashList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.cardWrap}>
                  <PostCard post={item} currentUserId={user?.id} isAdmin={user?.role === 'ADMIN'} />
                </View>
              )}
              ListHeaderComponent={Header}
              onEndReached={() => {
                if (feedQuery.hasNextPage && !feedQuery.isFetchingNextPage) {
                  feedQuery.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  tintColor={colors.primaryStrong}
                  colors={[colors.primaryStrong]}
                  refreshing={feedQuery.isRefetching && !feedQuery.isFetchingNextPage}
                  onRefresh={() => feedQuery.refetch()}
                />
              }
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.stateText}>ainda nao ha posts nesta comunidade.</Text>
                </View>
              }
            />
          )}

          {isMember ? (
            <Pressable
              onPress={handleCreatePost}
              disabled={!effectiveCommunityId}
              style={[styles.fab, !effectiveCommunityId ? styles.fabDisabled : null]}
              accessibilityLabel="criar post na comunidade"
            >
              <Ionicons name="add" size={32} color={colors.white} />
            </Pressable>
          ) : null}

          <CommunityMemberMenu
            visible={menuVisible}
            anchorPosition={menuAnchor}
            notifyNewPosts={community?.notifyNewPosts ?? null}
            canLeave={!!community && !isOwner}
            notificationsPending={notificationsMutation.isPending}
            leavePending={leaveMutation.isPending}
            onClose={() => setMenuVisible(false)}
            onToggleNotifications={handleToggleNotifications}
            onLeave={confirmLeaveCommunity}
          />
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}

function CommunityMemberMenu({
  visible,
  anchorPosition,
  notifyNewPosts,
  canLeave,
  notificationsPending,
  leavePending,
  onClose,
  onToggleNotifications,
  onLeave,
}: {
  visible: boolean;
  anchorPosition: { top: number; right: number } | null;
  notifyNewPosts: boolean | null;
  canLeave: boolean;
  notificationsPending: boolean;
  leavePending: boolean;
  onClose: () => void;
  onToggleNotifications: () => void;
  onLeave: () => void;
}) {
  const notificationLabel = notifyNewPosts ? 'Silenciar posts novos' : 'Reativar avisos de posts novos';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.menuOverlay} onPress={onClose}>
        {anchorPosition ? (
          <Pressable
            style={[
              styles.menuPopup,
              {
                top: anchorPosition.top,
                right: anchorPosition.right,
                width: Math.min(300, Dimensions.get('window').width - spacing.lg * 2),
              },
            ]}
            onPress={() => {}}
          >
            <Pressable
              style={({ pressed }) => [styles.menuAction, pressed ? styles.menuActionPressed : null]}
              onPress={onToggleNotifications}
              disabled={notifyNewPosts === null || notificationsPending}
            >
              <Ionicons
                name={notifyNewPosts ? 'notifications-off-outline' : 'notifications-outline'}
                size={18}
                color={colors.text}
              />
              <Text style={styles.menuActionText} numberOfLines={2}>
                {notificationsPending ? 'atualizando...' : notificationLabel}
              </Text>
            </Pressable>

            {canLeave ? (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  style={({ pressed }) => [styles.menuAction, pressed ? styles.menuActionPressed : null]}
                  onPress={onLeave}
                  disabled={leavePending}
                >
                  <Ionicons name="exit-outline" size={18} color="#ff4666" />
                  <Text style={[styles.menuActionText, styles.menuDanger]} numberOfLines={2}>
                    {leavePending ? 'saindo...' : 'Sair da comunidade'}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: { gap: spacing.sm, paddingBottom: spacing.md },
  coverWrap: {
    width: '100%',
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.26)',
    backgroundColor: colors.surfaceSoft,
  },
  cover: { width: '100%', height: '100%' },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  coverFallbackLabel: { color: colors.textMuted, fontSize: 28, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', flex: 1 },
  titleActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kebabButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: colors.textMuted, fontSize: 14 },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  joinButton: {
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: { opacity: 0.65 },
  joinButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  closedBox: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  closedText: { color: colors.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  inviteButton: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.28)',
    backgroundColor: 'rgba(139, 61, 255, 0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  inviteButtonText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  menuPopup: {
    position: 'absolute',
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.32)',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  menuActionPressed: { backgroundColor: 'rgba(143, 70, 255, 0.12)' },
  menuActionText: { color: colors.text, fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 20, flexShrink: 1 },
  menuDanger: { color: '#ff4666' },
  menuDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  memberGateContent: { paddingBottom: 120 },
  listContent: { paddingBottom: 120 },
  cardWrap: { paddingBottom: spacing.md },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accentBlueStrong,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  fabDisabled: { opacity: 0.4 },
});
