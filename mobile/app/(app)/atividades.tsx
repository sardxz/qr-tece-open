import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityFeed } from '../../components/profile/ActivityFeed';
import { activityQueryKey, type ActivityResponse } from '../../components/profile/types';
import { AppBackground } from '../../components/ui/AppBackground';
import { colors, spacing } from '../../components/ui/theme';
import { api, ApiClientError } from '../../lib/api/client';

export default function AtividadesScreen() {
  const activityQuery = useQuery({
    queryKey: activityQueryKey,
    queryFn: () => api<ActivityResponse>('/api/activity'),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.title}>atividades</Text>

          {activityQuery.isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.primaryStrong} />
              <Text style={styles.stateText}>carregando atividades...</Text>
            </View>
          ) : activityQuery.isError ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>não foi possível carregar</Text>
              <Text style={styles.stateText}>
                {activityQuery.error instanceof ApiClientError ? activityQuery.error.message.toLowerCase() : 'tente novamente em instantes.'}
              </Text>
            </View>
          ) : activityQuery.data ? (
            <ActivityFeed activity={activityQuery.data} />
          ) : (
            <View style={styles.centerState}>
              <Text style={styles.stateText}>nenhuma atividade por enquanto.</Text>
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
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
