import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommunityCard } from '../../../components/community/CommunityCard';
import { AppBackground } from '../../../components/ui/AppBackground';
import { colors, radius, spacing } from '../../../components/ui/theme';
import { api, ApiClientError } from '../../../lib/api/client';

type SearchResponse = {
  users: Array<{ id: string; username: string; gender: string | null }>;
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    coverImageUrl: string | null;
    _count: { members: number };
  }>;
};

export default function BuscarScreen() {
  const [query, setQuery] = useState('');
  const normalized = useMemo(() => query.trim(), [query]);

  const searchQuery = useQuery({
    queryKey: ['search', normalized],
    enabled: normalized.length >= 2,
    queryFn: () => api<SearchResponse>(`/api/search?q=${encodeURIComponent(normalized)}`),
  });

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <Text style={styles.title}>buscar</Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="buscar pessoas e comus"
            placeholderTextColor={colors.textSoft}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {normalized.length < 2 ? (
            <View style={styles.centerState}>
              <Text style={styles.stateText}>digite pelo menos 2 letras.</Text>
            </View>
          ) : searchQuery.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>buscando...</Text>
            </View>
          ) : searchQuery.isError ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>não foi possível buscar</Text>
              <Text style={styles.stateText}>
                {searchQuery.error instanceof ApiClientError ? searchQuery.error.message.toLowerCase() : 'tente novamente em instantes.'}
              </Text>
            </View>
          ) : (
            <View style={styles.results}>
              {searchQuery.data?.users.map((user) => (
                <Pressable key={user.id} onPress={() => router.push(`/usuario/${user.username}`)} style={styles.userCard}>
                  <Text style={styles.userName}>@{user.username}</Text>
                </Pressable>
              ))}

              {searchQuery.data?.communities.map((community) => (
                <View key={community.id} style={styles.communityWrap}>
                  <CommunityCard
                    community={{
                      id: community.id,
                      name: community.name,
                      slug: community.slug,
                      coverImageUrl: community.coverImageUrl,
                      memberCount: community._count.members,
                    }}
                    onPress={() =>
                      router.push({
                        pathname: '/comunidade/[slug]',
                        params: {
                          slug: community.slug,
                          communityId: community.id,
                          name: community.name,
                          coverImageUrl: community.coverImageUrl ?? '',
                          memberCount: String(community._count.members),
                        },
                      })
                    }
                  />
                </View>
              ))}

              {searchQuery.data && searchQuery.data.users.length === 0 && searchQuery.data.communities.length === 0 ? (
                <View style={styles.centerState}>
                  <Text style={styles.stateText}>nenhum resultado encontrado.</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  title: { color: colors.text, fontSize: 30, fontWeight: '700' },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  results: {
    gap: spacing.md,
    paddingBottom: 120,
  },
  userCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  userName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  communityWrap: {
    marginBottom: spacing.xs,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
