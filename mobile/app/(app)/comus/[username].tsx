import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityCard, type CommunityListItem } from '../../../components/community/CommunityCard';
import { AppBackground } from '../../../components/ui/AppBackground';
import { colors, spacing } from '../../../components/ui/theme';
import { api, ApiClientError } from '../../../lib/api/client';

type CommunitiesResponse = {
  communities: Array<CommunityListItem & { joinedAt: string; role: string }>;
  total: number;
  page: number;
  totalPages: number;
};

export default function UserComusScreen() {
  const params = useLocalSearchParams<{ username?: string | string[] }>();
  const username = Array.isArray(params.username) ? params.username[0] : params.username;

  const query = useQuery({
    queryKey: ['profile', username, 'communities'],
    enabled: !!username,
    queryFn: () =>
      api<CommunitiesResponse>(`/api/profile/${encodeURIComponent(username as string)}/communities?page=1&limit=50`),
  });

  const communities = query.data?.communities ?? [];

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
            <Text style={styles.headerTitle} numberOfLines={1}>comus de @{username}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {query.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>carregando comunidades...</Text>
            </View>
          ) : query.isError ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>não foi possível carregar</Text>
              <Text style={styles.stateText}>
                {query.error instanceof ApiClientError
                  ? query.error.message.toLowerCase()
                  : 'tente novamente em instantes.'}
              </Text>
            </View>
          ) : (
            <FlashList
              data={communities}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CommunityCard
                  community={item}
                  onPress={() => router.push(`/comunidade/${item.slug}`)}
                />
              )}
              refreshControl={
                <RefreshControl
                  tintColor={colors.primaryStrong}
                  colors={[colors.primaryStrong]}
                  refreshing={query.isRefetching}
                  onRefresh={() => query.refetch()}
                />
              }
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.stateText}>nenhuma comunidade encontrada.</Text>
                </View>
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
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
