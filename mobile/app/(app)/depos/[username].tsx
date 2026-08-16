import { useInfiniteQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileAvatar } from '../../../components/profile/ProfileAvatar';
import { formatProfileDate } from '../../../components/profile/profile-utils';
import { type DeposResponse } from '../../../components/profile/types';
import { AppBackground } from '../../../components/ui/AppBackground';
import { colors, radius, spacing } from '../../../components/ui/theme';
import { api, ApiClientError } from '../../../lib/api/client';
import { linkifyNative } from '../../../components/post/Linkify';

const PAGE_SIZE = 20;

async function fetchDepos(username: string, page: number) {
  return api<DeposResponse>(`/api/profile/${username}/depos?page=${page}&limit=${PAGE_SIZE}`);
}

export default function DeposScreen() {
  const params = useLocalSearchParams<{ username?: string | string[] }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  const query = useInfiniteQuery({
    queryKey: ['profile', username, 'depos-full'],
    enabled: !!username,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchDepos(username as string, pageParam),
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : null),
  });

  const depos = query.data?.pages.flatMap((page) => page.depos) ?? [];

  if (!username) {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>usuário não informado</Text>
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.headerAction}>voltar</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>depos de @{username}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {query.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>carregando depos...</Text>
            </View>
          ) : query.isError ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>não foi possível carregar</Text>
              <Text style={styles.stateText}>
                {query.error instanceof ApiClientError ? query.error.message.toLowerCase() : 'tente em instantes.'}
              </Text>
            </View>
          ) : (
            <FlashList
              data={depos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.depoItem}>
                  <View style={styles.depoHeader}>
                    <ProfileAvatar username={item.author.username} imageUrl={item.author.profileImageUrl} size={40} />
                    <View style={styles.depoMeta}>
                      <Text style={styles.depoAuthor}>@{item.author.username}</Text>
                      <Text style={styles.depoDate}>{formatProfileDate(item.approvedAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.depoContent}>{linkifyNative(item.content)}</Text>
                </View>
              )}
              onEndReached={() => {
                if (query.hasNextPage && !query.isFetchingNextPage) {
                  query.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.4}
              refreshControl={
                <RefreshControl
                  tintColor={colors.primaryStrong}
                  colors={[colors.primaryStrong]}
                  refreshing={query.isRefetching && !query.isFetchingNextPage}
                  onRefresh={() => query.refetch()}
                />
              }
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.stateText}>ainda não há depos aprovados.</Text>
                </View>
              }
              ListFooterComponent={
                query.isFetchingNextPage ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator color={colors.primaryStrong} />
                  </View>
                ) : (
                  <View style={styles.footerSpace} />
                )
              }
            />
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
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 48 },
  listContent: { paddingBottom: 120 },
  depoItem: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  depoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  depoMeta: { gap: 2 },
  depoAuthor: { color: colors.text, fontSize: 14, fontWeight: '700' },
  depoDate: { color: colors.textSoft, fontSize: 12 },
  depoContent: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  footerLoading: { paddingVertical: spacing.md, alignItems: 'center' },
  footerSpace: { height: 12 },
});
