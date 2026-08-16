import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type CommunityListItem } from '../../../components/community/CommunityCard';
import { PostCard } from '../../../components/post/PostCard';
import { feedQueryKey, type Post, type PostsPage } from '../../../components/post/types';
import { getMediaUri } from '../../../components/profile/profile-utils';
import { activityQueryKey, type ActivityResponse } from '../../../components/profile/types';
import { AppBackground } from '../../../components/ui/AppBackground';
import { HeaderMenuSheet } from '../../../components/ui/HeaderMenuSheet';
import { colors, radius, spacing } from '../../../components/ui/theme';
import { api, ApiClientError } from '../../../lib/api/client';
import { useAuth } from '../../../lib/auth/context';
import { communityViewsQueryKey, getCommunityViews } from '../../../lib/storage/community-views';

type CommunitiesResponse = {
  communities: Array<CommunityListItem & { joinedAt: string; role: string }>;
};

async function fetchFeed(cursor: string | null) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return api<PostsPage>(`/api/posts${suffix}`);
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const menuButtonRef = useRef<View>(null);

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      setMenuAnchor({ top: y + height + 6, right: screenWidth - (x + width) });
      setMenuVisible(true);
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace('/');
    }
  };

  const handleOpenActivity = () => {
    router.push('/atividades');
    api('/api/activity/reset', { method: 'POST' })
      .then(() => queryClient.invalidateQueries({ queryKey: activityQueryKey }))
      .catch(() => {
        // best-effort: se falhar, o pontinho some quando a tela de atividades reabrir o /api/activity
      });
  };

  const feedQuery = useInfiniteQuery({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam }) => fetchFeed(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const activityQuery = useQuery({
    queryKey: activityQueryKey,
    queryFn: () => api<ActivityResponse>('/api/activity'),
    // Polling: enquanto o app está em foreground, atualiza o sino a cada 30s.
    // Em background, o intervalo pausa (refetchIntervalInBackground default = false).
    refetchInterval: 30_000,
  });

  const communitiesQuery = useQuery({
    queryKey: ['profile', user?.username, 'communities', 'feed-strip'],
    enabled: !!user?.username,
    queryFn: () => api<CommunitiesResponse>(`/api/profile/${user?.username}/communities?page=1&limit=12`),
  });

  const communityViewsQuery = useQuery({
    queryKey: communityViewsQueryKey,
    queryFn: getCommunityViews,
  });

  const baseCommunities = communitiesQuery.data?.communities ?? [];

  const latestPostQueries = useQueries({
    queries: baseCommunities.map((community) => ({
      queryKey: ['community-strip', community.id],
      queryFn: () => api<PostsPage>(`/api/posts?communityId=${community.id}`),
      staleTime: 30_000,
    })),
  });

  const communityViews = communityViewsQuery.data ?? {};

  const communities = baseCommunities
    .map((community, index) => {
      const posts = latestPostQueries[index]?.data?.posts ?? [];
      // Post mais recente que NÃO seja do próprio usuário (próprio post não gera "novo").
      const latestForeignPost = posts.find((post) => post.author.id !== user?.id);
      const lastViewedAt = communityViews[community.id] ?? community.joinedAt;
      const hasNew = !!latestForeignPost && new Date(latestForeignPost.createdAt) > new Date(lastViewedAt);
      const latestAt = latestForeignPost?.createdAt ?? posts[0]?.createdAt ?? community.joinedAt;
      return { ...community, latestAt, lastViewedAt, hasNew };
    })
    .sort((a, b) => {
      // 1) Comus com novidade vêm primeiro, ordenadas por data do post novo.
      if (a.hasNew !== b.hasNew) return a.hasNew ? -1 : 1;
      if (a.hasNew && b.hasNew) {
        return new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime();
      }
      // 2) Entre as sem novidade: a vista mais recentemente vai pro FINAL.
      // Quem foi visualizado há mais tempo (ou nunca) aparece antes.
      return new Date(a.lastViewedAt).getTime() - new Date(b.lastViewedAt).getTime();
    });

  const posts = feedQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  const hasNewActivity = (activityQuery.data?.totalNew ?? 0) > 0;

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.brand}>qr.tecê?</Text>

            <View style={styles.headerActions}>
              <Pressable onPress={handleOpenActivity} style={styles.bellButton}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
                {hasNewActivity ? <View style={styles.bellDot} /> : null}
              </Pressable>

              {user ? (
                <Pressable ref={menuButtonRef} onPress={openMenu} hitSlop={8} style={styles.menuButton}>
                  <Ionicons name="menu" size={26} color={colors.text} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {(() => {
            const CommunitiesHeader =
              communities.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.communityStrip}
                  style={styles.communityStripScroll}
                >
                  {communities.map((community) => (
                    <Pressable
                      key={community.id}
                      onPress={() =>
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
                        })
                      }
                      style={styles.communityThumb}
                    >
                      {getMediaUri(community.coverImageUrl) ? (
                        <Image
                          source={{ uri: getMediaUri(community.coverImageUrl) ?? '' }}
                          style={[styles.communityThumbImage, community.hasNew ? styles.communityThumbImageNew : null]}
                          contentFit="cover"
                          transition={200}
                        />
                      ) : (
                        <View style={[styles.communityThumbImage, styles.communityThumbFallback, community.hasNew ? styles.communityThumbImageNew : null]}>
                          <Text style={styles.communityFallbackLabel}>#{community.slug.slice(0, 2)}</Text>
                        </View>
                      )}
                      <Text style={styles.communityLabel} numberOfLines={1}>
                        {community.name.toLowerCase()}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null;

            if (feedQuery.isLoading) {
              return (
                <View style={styles.centerState}>
                  <ActivityIndicator color={colors.primaryStrong} />
                  <Text style={styles.stateText}>carregando...</Text>
                </View>
              );
            }

            if (feedQuery.isError) {
              return (
                <View style={styles.centerState}>
                  <Text style={styles.stateTitle}>não foi possível carregar</Text>
                  <Text style={styles.stateText}>
                    {feedQuery.error instanceof ApiClientError
                      ? feedQuery.error.message.toLowerCase()
                      : 'tente novamente em instantes.'}
                  </Text>
                </View>
              );
            }

            return (
              <FlashList
                data={posts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.cardWrap}>
                    <PostCard post={item} currentUserId={user?.id} isAdmin={user?.role === 'ADMIN'} />
                  </View>
                )}
                ListHeaderComponent={CommunitiesHeader}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.stateText}>ainda não há posts no feed.</Text>
                  </View>
                }
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
                    onRefresh={() => {
                      feedQuery.refetch();
                      activityQuery.refetch();
                      communitiesQuery.refetch();
                      queryClient.invalidateQueries({ queryKey: ['community-strip'] });
                    }}
                  />
                }
                contentContainerStyle={styles.listContent}
                ListFooterComponent={
                  feedQuery.isFetchingNextPage ? (
                    <View style={styles.footerLoading}>
                      <ActivityIndicator color={colors.primaryStrong} />
                    </View>
                  ) : (
                    <View style={styles.footerSpace} />
                  )
                }
              />
            );
          })()}

          <Pressable onPress={() => router.push('/criar')} style={styles.fab} accessibilityLabel="criar post">
            <Ionicons name="add" size={32} color={colors.white} />
          </Pressable>
        </View>
      </SafeAreaView>

      <HeaderMenuSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onProfile={() => router.push('/perfil')}
        onSettings={() => router.push('/configuracoes')}
        onLogout={handleLogout}
        anchorPosition={menuAnchor}
      />
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
  brand: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bellButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  menuButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: '#ff4666',
    borderWidth: 2,
    borderColor: colors.background,
  },
  communityStripScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  communityStrip: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  communityThumb: {
    width: 88,
    marginRight: spacing.sm,
    gap: 8,
    alignItems: 'center',
  },
  communityThumbImage: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.26)',
  },
  communityThumbImageNew: {
    borderWidth: 3,
    borderColor: colors.accentOrange,
  },
  communityThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityFallbackLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  communityLabel: {
    color: colors.text,
    fontSize: 13,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 120,
  },
  cardWrap: {
    paddingBottom: spacing.md,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: 72,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 280,
  },
  footerLoading: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSpace: {
    height: 12,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
});
