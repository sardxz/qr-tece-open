import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MentionTypeahead } from '../../../components/post/MentionTypeahead';
import { PostCard } from '../../../components/post/PostCard';
import {
  feedQueryKey,
  postQueryKey,
  repliesQueryKey,
  type Post,
  type RepliesPage,
} from '../../../components/post/types';
import { mapInfiniteReplies, normalizePostContent } from '../../../components/post/post-utils';
import { AppBackground } from '../../../components/ui/AppBackground';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { colors, radius, spacing } from '../../../components/ui/theme';
import { ApiClientError, api } from '../../../lib/api/client';
import { useAuth } from '../../../lib/auth/context';

async function fetchReplies(postId: string, cursor: string | null) {
  const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return api<RepliesPage>(`/api/posts/${postId}/replies${suffix}`);
}

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const postId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [composerOpen, setComposerOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySelectionStart, setReplySelectionStart] = useState(0);
  const [replyTarget, setReplyTarget] = useState<Post | null>(null);
  const replyInputRef = useRef<TextInput>(null);

  const handleReplySelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setReplySelectionStart(e.nativeEvent.selection.start);
  };

  const handleReplyMentionSelect = (newText: string, newCursorPosition: number) => {
    setReplyContent(newText);
    setReplySelectionStart(newCursorPosition);
    setTimeout(() => {
      replyInputRef.current?.setNativeProps({ selection: { start: newCursorPosition, end: newCursorPosition } });
    }, 0);
  };

  const detailQuery = useQuery({
    queryKey: postQueryKey(postId ?? ''),
    queryFn: () => api<Post>(`/api/posts/${postId}`),
    enabled: !!postId,
  });

  const repliesQuery = useInfiniteQuery({
    queryKey: repliesQueryKey(postId ?? ''),
    queryFn: ({ pageParam }) => fetchReplies(postId ?? '', pageParam),
    enabled: !!postId,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const replies = useMemo(
    () => repliesQuery.data?.pages.flatMap((page) => page.replies) ?? [],
    [repliesQuery.data]
  );

  const replyMutation = useMutation({
    mutationFn: async () => {
      const normalized = normalizePostContent(replyContent);
      return api<Post>('/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: normalized, replyToId: replyTarget?.id ?? postId }),
      });
    },
    onSuccess: (newReply) => {
      const targetId = replyTarget?.id ?? postId ?? '';
      const repliesToFocusedPost = targetId === postId;

      setReplyContent('');
      setReplyError(null);
      setComposerOpen(false);
      setReplyTarget(null);

      if (repliesToFocusedPost) {
        queryClient.setQueryData(repliesQueryKey(postId ?? ''), (old: unknown) => {
          const data = old as { pages: RepliesPage[]; pageParams: Array<string | null> } | undefined;
          if (!data) {
            return {
              pageParams: [null],
              pages: [{ replies: [newReply], nextCursor: null }],
            };
          }
          const [firstPage, ...restPages] = data.pages;
          return {
            ...data,
            pages: [{ ...firstPage, replies: [newReply, ...firstPage.replies] }, ...restPages],
          };
        });
        queryClient.setQueryData<Post>(postQueryKey(postId ?? ''), (old) =>
          old
            ? {
                ...old,
                _count: {
                  ...old._count,
                  comments: old._count.comments + 1,
                },
              }
            : old
        );
      }

      queryClient.invalidateQueries({ queryKey: repliesQueryKey(targetId) });
      queryClient.invalidateQueries({ queryKey: postQueryKey(targetId) });
      queryClient.invalidateQueries({ queryKey: repliesQueryKey(postId ?? '') });
      queryClient.invalidateQueries({ queryKey: postQueryKey(postId ?? '') });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setReplyError(error.message.toLowerCase());
      } else if (error instanceof Error) {
        setReplyError(error.message.toLowerCase());
      } else {
        setReplyError('não foi possível publicar sua resposta agora.');
      }
    },
  });

  const handleSubmit = () => {
    const normalized = normalizePostContent(replyContent);
    if (!normalized) {
      setReplyError('sua resposta não pode ficar vazia.');
      return;
    }
    if (normalized.length > 1000) {
      setReplyError('sua resposta passou do limite de 1000 caracteres.');
      return;
    }
    setReplyError(null);
    replyMutation.mutate();
  };

  const handleCloseComposer = () => {
    setComposerOpen(false);
    setReplyError(null);
    setReplyTarget(null);
  };

  if (!postId) {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerState}>
            <Text style={styles.stateTitle}>post inválido</Text>
            <Text style={styles.stateText}>não encontramos o identificador desse post.</Text>
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  const remaining = 1000 - replyContent.length;

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboard}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.headerAction}>voltar</Text>
              </Pressable>
              <Text style={styles.headerTitle}>conversa</Text>
              <View style={styles.headerSpacer} />
            </View>

            {detailQuery.isLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color={colors.primaryStrong} />
                <Text style={styles.stateText}>carregando o post do qr.tecê...</Text>
              </View>
            ) : detailQuery.isError || !detailQuery.data ? (
              <View style={styles.centerState}>
                <Text style={styles.stateTitle}>não foi possível abrir esse post</Text>
                <Text style={styles.stateText}>
                  {detailQuery.error instanceof ApiClientError
                    ? detailQuery.error.message.toLowerCase()
                    : 'tente de novo em instantes.'}
                </Text>
                <Pressable onPress={() => detailQuery.refetch()} style={styles.inlineButton}>
                  <Text style={styles.inlineButtonText}>tentar de novo</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.listWrap}>
                <FlashList
                  data={replies}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.replyCardWrap}>
                      <PostCard
                        post={item}
                        currentUserId={user?.id}
                        isAdmin={user?.role === 'ADMIN'}
                        compact
                        hideReplyContext={item.replyTo?.id === postId}
                        onCommentPress={(target) => {
                          router.push(`/post/${target.id}`);
                        }}
                        onDeleted={() => {
                          queryClient.setQueryData(repliesQueryKey(postId), (old: unknown) =>
                            mapInfiniteReplies(
                              old as { pages: RepliesPage[]; pageParams: Array<string | null> } | undefined,
                              (reply) => reply
                            )
                          );
                          queryClient.invalidateQueries({ queryKey: repliesQueryKey(postId) });
                          queryClient.invalidateQueries({ queryKey: postQueryKey(postId) });
                          queryClient.invalidateQueries({ queryKey: feedQueryKey });
                        }}
                      />
                    </View>
                  )}
                  onEndReached={() => {
                    if (repliesQuery.hasNextPage && !repliesQuery.isFetchingNextPage) {
                      repliesQuery.fetchNextPage();
                    }
                  }}
                  onEndReachedThreshold={0.4}
                  refreshControl={
                    <RefreshControl
                      tintColor={colors.primaryStrong}
                      colors={[colors.primaryStrong]}
                      refreshing={repliesQuery.isRefetching && !repliesQuery.isFetchingNextPage}
                      onRefresh={() => {
                        detailQuery.refetch();
                        repliesQuery.refetch();
                      }}
                    />
                  }
                  contentContainerStyle={styles.listContent}
                  keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={
                    <View style={styles.listHeader}>
                      <PostCard
                        post={detailQuery.data}
                        currentUserId={user?.id}
                        isAdmin={user?.role === 'ADMIN'}
                        disablePress
                        onCommentPress={() => {
                          setReplyTarget(null);
                          setComposerOpen(true);
                        }}
                        onDeleted={() => {
                          queryClient.invalidateQueries({ queryKey: feedQueryKey });
                          router.replace('/home');
                        }}
                      />
                      <Text style={styles.repliesHeading}>respostas</Text>
                    </View>
                  }
                  ListEmptyComponent={
                    repliesQuery.isLoading ? null : (
                      <View style={styles.emptyReplies}>
                        <Text style={styles.stateTitle}>ainda sem respostas</Text>
                        <Text style={styles.stateText}>seja a primeira pessoa a continuar essa conversa.</Text>
                      </View>
                    )
                  }
                  ListFooterComponent={
                    repliesQuery.isFetchingNextPage ? (
                      <View style={styles.footerLoading}>
                        <ActivityIndicator color={colors.primaryStrong} />
                      </View>
                    ) : (
                      <View style={styles.footerSpace} />
                    )
                  }
                />
              </View>
            )}

            {composerOpen ? (
              <View style={styles.composerExpanded}>
                <View style={styles.composerHeader}>
                  <Pressable onPress={handleCloseComposer} hitSlop={10} accessibilityLabel="fechar">
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </Pressable>
                  <Text style={styles.composerCounter}>{remaining}</Text>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={replyMutation.isPending}
                    style={[styles.composerSubmit, replyMutation.isPending ? styles.composerSubmitDisabled : null]}
                  >
                    {replyMutation.isPending ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.composerSubmitText}>responder</Text>
                    )}
                  </Pressable>
                </View>
                {replyTarget ? (
                  <View style={styles.replyTargetBanner}>
                    <Text style={styles.replyTargetText}>
                      respondendo a @{replyTarget.author.username}
                    </Text>
                    <Pressable onPress={() => setReplyTarget(null)} hitSlop={10}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ) : null}
                {replyError ? <StatusNotice tone="error" message={replyError} /> : null}
                <TextInput
                  ref={replyInputRef}
                  multiline
                  autoFocus
                  value={replyContent}
                  onChangeText={setReplyContent}
                  onSelectionChange={handleReplySelectionChange}
                  placeholder="escreva uma resposta..."
                  placeholderTextColor={colors.textSoft}
                  textAlignVertical="top"
                  style={styles.composerInput}
                  maxLength={1000}
                />
                <MentionTypeahead
                  text={replyContent}
                  selectionStart={replySelectionStart}
                  onSelect={handleReplyMentionSelect}
                />
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  setReplyTarget(null);
                  setComposerOpen(true);
                }}
                style={styles.composerBar}
                accessibilityLabel="escrever resposta"
              >
                <Text style={styles.composerPlaceholder}>escreva uma resposta...</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerAction: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  headerSpacer: { width: 48 },
  listWrap: { flex: 1 },
  listContent: { paddingBottom: spacing.md },
  listHeader: { gap: spacing.md, paddingBottom: spacing.md },
  repliesHeading: { color: colors.text, fontSize: 20, fontWeight: '700' },
  replyCardWrap: { paddingBottom: spacing.md },
  composerBar: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10, 12, 28, 0.92)',
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  composerPlaceholder: { color: colors.textSoft, fontSize: 15 },
  composerExpanded: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.26)',
    backgroundColor: 'rgba(10, 12, 28, 0.92)',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 4,
  },
  composerCounter: { color: colors.textSoft, fontSize: 13, fontWeight: '600' },
  composerSubmit: {
    minWidth: 96,
    minHeight: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  composerSubmitDisabled: { opacity: 0.5 },
  composerSubmitText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  composerInput: {
    minHeight: 96,
    maxHeight: 200,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  replyTargetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(143, 70, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.22)',
  },
  replyTargetText: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, paddingBottom: 72 },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 280 },
  inlineButton: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.28)',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  inlineButtonText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  emptyReplies: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  footerLoading: { paddingVertical: spacing.md, alignItems: 'center' },
  footerSpace: { height: 12 },
});
