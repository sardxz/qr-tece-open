import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { colors, radius, spacing } from '../ui/theme';
import { api } from '../../lib/api/client';

const MIN_QUERY_LENGTH = 3;
const MAX_VISIBLE = 5;

type MentionUser = {
  id: string;
  username: string;
  gender: string | null;
  profileImageUrl: string | null;
};

type SearchResponse = {
  users: MentionUser[];
  communities: unknown[];
};

type Props = {
  // Texto completo do TextInput (sem o que vem do cursor pra frente importar)
  text: string;
  // Posição atual do cursor no TextInput
  selectionStart: number;
  // Callback chamado quando usuário toca em uma sugestão.
  // Recebe o novo texto completo e a nova posição do cursor.
  onSelect: (newText: string, newCursorPosition: number) => void;
};

// Encontra `@xxx` imediatamente antes do cursor (sem espaço entre @ e o cursor).
// Retorna a query parcial (sem o @) ou null se não houver match.
export function detectMentionQuery(text: string, cursor: number): { query: string; start: number } | null {
  const beforeCursor = text.slice(0, cursor);
  const match = beforeCursor.match(/(?:^|\s)@(\w*)$/);
  if (!match) return null;
  const query = match[1] ?? '';
  // start é o índice do `@` no texto original
  const start = beforeCursor.length - query.length - 1;
  return { query, start };
}

export function MentionTypeahead({ text, selectionStart, onSelect }: Props) {
  const mention = detectMentionQuery(text, selectionStart);
  const query = mention?.query ?? '';
  const active = !!mention && query.length >= MIN_QUERY_LENGTH;

  const searchQuery = useQuery({
    queryKey: ['mention-typeahead', query],
    enabled: active,
    queryFn: () => api<SearchResponse>(`/api/search?q=@${encodeURIComponent(query)}`),
    staleTime: 10_000,
  });

  if (!active) return null;

  const users = searchQuery.data?.users ?? [];

  const handleSelect = (user: MentionUser) => {
    if (!mention) return;
    const before = text.slice(0, mention.start);
    const after = text.slice(selectionStart);
    const replacement = `@${user.username} `;
    const newText = `${before}${replacement}${after}`;
    const newCursorPosition = before.length + replacement.length;
    onSelect(newText, newCursorPosition);
  };

  // Calcular altura máxima baseada em MAX_VISIBLE * item height (~52px cada)
  const itemHeight = 52;
  const maxHeight = MAX_VISIBLE * itemHeight + 8;

  return (
    <View style={[styles.container, { maxHeight }]} pointerEvents="box-none">
      {searchQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primaryStrong} size="small" />
          <Text style={styles.loadingText}>buscando @{query}...</Text>
        </View>
      ) : users.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>nenhum usuário encontrado.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyboardShouldPersistTaps="always"
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelect(item)}
              style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            >
              <ProfileAvatar username={item.username} imageUrl={item.profileImageUrl} size={32} />
              <Text style={styles.username}>@{item.username}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.32)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  loadingText: { color: colors.textMuted, fontSize: 13 },
  empty: { padding: spacing.sm },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  rowPressed: { backgroundColor: 'rgba(143, 70, 255, 0.12)' },
  username: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
