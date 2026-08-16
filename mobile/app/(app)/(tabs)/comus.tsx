import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityCard, type CommunityListItem } from '../../../components/community/CommunityCard';
import { AppBackground } from '../../../components/ui/AppBackground';
import { colors, radius, spacing } from '../../../components/ui/theme';
import { api, ApiClientError } from '../../../lib/api/client';

type CommunitySort = 'trending' | 'new' | 'biggest';
type CommunityScope = 'mine' | 'discover';

type DiscoverCommunity = CommunityListItem & {
  isPrivate: boolean;
  isJoined: boolean;
  locked: boolean;
  createdAt?: string;
};

type CommunitiesResponse = {
  communities: DiscoverCommunity[];
};

type ListItem =
  | { type: 'intro'; id: string; title: string; subtitle: string }
  | { type: 'community'; id: string; community: DiscoverCommunity };

const sortOptions: Array<{ value: CommunitySort; label: string }> = [
  { value: 'trending', label: 'Em alta' },
  { value: 'new', label: 'Novas' },
  { value: 'biggest', label: 'Maiores' },
];

export default function ComusScreen() {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<CommunityScope>('mine');
  const [sort, setSort] = useState<CommunitySort>('trending');
  const normalizedSearch = useMemo(() => search.trim(), [search]);

  const communitiesQuery = useQuery({
    queryKey: ['communities', 'discover', sort, normalizedSearch],
    queryFn: () => {
      const params = new URLSearchParams({ sort });
      if (normalizedSearch) {
        params.set('q', normalizedSearch);
      }
      return api<CommunitiesResponse>(`/api/communities?${params.toString()}`);
    },
  });

  const communities = communitiesQuery.data?.communities ?? [];
  const myCommunities = communities.filter((community) => community.isJoined);
  const discoverCommunities = communities.filter((community) => !community.isJoined);
  const isSearching = normalizedSearch.length > 0;
  const hasNoMemberships = myCommunities.length === 0;
  const activeCommunities = scope === 'mine' ? myCommunities : discoverCommunities;

  useEffect(() => {
    if (!communitiesQuery.isSuccess) {
      return;
    }
    if (scope === 'mine' && hasNoMemberships && discoverCommunities.length > 0) {
      setScope('discover');
    }
  }, [communitiesQuery.isSuccess, discoverCommunities.length, hasNoMemberships, scope]);

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (scope === 'discover' && hasNoMemberships && discoverCommunities.length > 0) {
      items.push({
        type: 'intro',
        id: 'intro',
        title: 'Comece por aqui',
        subtitle: 'comus em alta para voce conhecer agora',
      });
    }

    items.push(...activeCommunities.map((community) => ({ type: 'community' as const, id: `${scope}-${community.id}`, community })));

    return items;
  }, [activeCommunities, discoverCommunities.length, hasNoMemberships, scope]);

  const openCommunity = (community: DiscoverCommunity) => {
    router.push({
      pathname: '/comunidade/[slug]',
      params: {
        slug: community.slug,
        communityId: community.id,
        name: community.name,
        coverImageUrl: community.coverImageUrl ?? '',
        memberCount: typeof community.memberCount === 'number' ? String(community.memberCount) : '',
        description: community.description ?? '',
      },
    });
  };

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>comunidades</Text>
            <Pressable
              onPress={() => router.push('/nova-comu')}
              style={styles.addButton}
              accessibilityLabel="criar comunidade"
            >
              <Ionicons name="add" size={26} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.textSoft} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="buscar comus"
              placeholderTextColor={colors.textSoft}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="limpar busca">
                <Ionicons name="close-circle" size={18} color={colors.textSoft} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.scopeTabs}>
            <Pressable
              onPress={() => setScope('mine')}
              style={[styles.scopeTab, scope === 'mine' ? styles.scopeTabActive : null]}
            >
              <Text style={[styles.scopeTabText, scope === 'mine' ? styles.scopeTabTextActive : null]}>
                Minhas comus
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setScope('discover')}
              style={[styles.scopeTab, scope === 'discover' ? styles.scopeTabActive : null]}
            >
              <Text style={[styles.scopeTabText, scope === 'discover' ? styles.scopeTabTextActive : null]}>
                Descobrir
              </Text>
            </Pressable>
          </View>

          {scope === 'discover' ? (
            <View style={styles.sortRow}>
              {sortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setSort(option.value)}
                  style={[styles.sortChip, sort === option.value ? styles.sortChipActive : null]}
                >
                  <Text style={[styles.sortChipText, sort === option.value ? styles.sortChipTextActive : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {scope === 'mine' ? (
            <View style={styles.scopeSummary}>
              <Text style={styles.scopeSummaryText}>
                {myCommunities.length} {myCommunities.length === 1 ? 'comu' : 'comus'}
              </Text>
            </View>
          ) : (
            <View style={styles.scopeSummary}>
              <Text style={styles.scopeSummaryText}>
                {isSearching ? 'resultados da busca' : 'comus abertas e convites possiveis'}
              </Text>
            </View>
          )}

          {communitiesQuery.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>carregando comunidades...</Text>
            </View>
          ) : communitiesQuery.isError ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>nao foi possivel carregar</Text>
              <Text style={styles.stateText}>
                {communitiesQuery.error instanceof ApiClientError ? communitiesQuery.error.message.toLowerCase() : 'tente novamente em instantes.'}
              </Text>
            </View>
          ) : (
            <FlashList
              data={listItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                if (item.type === 'intro') {
                  return (
                    <View style={styles.intro}>
                      <Text style={styles.introTitle}>{item.title}</Text>
                      <Text style={styles.introText}>{item.subtitle}</Text>
                    </View>
                  );
                }

                return (
                  <View style={styles.cardWrap}>
                    <CommunityCard community={item.community} onPress={() => openCommunity(item.community)} />
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <Text style={styles.stateTitle}>
                    {isSearching ? 'nada encontrado' : scope === 'mine' ? 'nenhuma comu ainda' : 'nenhuma comu por aqui'}
                  </Text>
                  <Text style={styles.stateText}>
                    {isSearching
                      ? 'tente buscar por outro nome ou descricao.'
                      : scope === 'mine'
                        ? 'use a aba descobrir para encontrar uma comu.'
                        : 'quando aparecerem comus publicas, elas ficam aqui.'}
                  </Text>
                  {scope === 'mine' ? (
                    <Pressable onPress={() => setScope('discover')} style={styles.emptyAction}>
                      <Text style={styles.emptyActionText}>ir para descobrir</Text>
                    </Pressable>
                  ) : null}
                </View>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { color: colors.text, fontSize: 30, fontWeight: '700' },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 0,
  },
  scopeTabs: {
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.72)',
    flexDirection: 'row',
    padding: 3,
  },
  scopeTab: {
    flex: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  scopeTabActive: {
    backgroundColor: colors.primary,
  },
  scopeTabText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  scopeTabTextActive: {
    color: colors.white,
  },
  scopeSummary: {
    marginTop: -spacing.sm,
  },
  scopeSummaryText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  sortChip: {
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 18, 38, 0.72)',
  },
  sortChipActive: {
    borderColor: colors.primaryStrong,
    backgroundColor: colors.primarySoft,
  },
  sortChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  sortChipTextActive: { color: colors.text },
  listContent: { paddingBottom: 120 },
  intro: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.34)',
    backgroundColor: 'rgba(13, 35, 55, 0.62)',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 4,
  },
  introTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  introText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  cardWrap: { paddingBottom: spacing.md },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyAction: {
    marginTop: spacing.sm,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionText: { color: colors.white, fontSize: 14, fontWeight: '800' },
});
