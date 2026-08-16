import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMediaUri } from '../../components/profile/profile-utils';
import { feedQueryKey, postQueryKey, type Post } from '../../components/post/types';
import { getUploadErrorMessage, pickImageFromLibrary, uploadImageAsset } from '../../components/upload/image-upload';
import { MentionTypeahead } from '../../components/post/MentionTypeahead';
import { AppBackground } from '../../components/ui/AppBackground';
import { StatusNotice } from '../../components/ui/StatusNotice';
import { colors, radius, spacing } from '../../components/ui/theme';
import { api, ApiClientError } from '../../lib/api/client';
import { mapInfinitePosts, normalizePostContent, prependFeedPost } from '../../components/post/post-utils';

type EditResponse = {
  id: string;
  content: string;
  updatedAt: string;
};

type SelectedImage = {
  localUri: string;
  remoteUrl: string;
};

type DraftState = {
  source: string | null;
  value: string;
};

export default function CriarPostScreen() {
  const params = useLocalSearchParams<{
    mode?: string | string[];
    postId?: string | string[];
    communityId?: string | string[];
    communityName?: string | string[];
    initialContent?: string | string[];
  }>();
  const queryClient = useQueryClient();
  const mode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const communityId = Array.isArray(params.communityId) ? params.communityId[0] : params.communityId;
  const communityName = Array.isArray(params.communityName) ? params.communityName[0] : params.communityName;
  const initialContent = Array.isArray(params.initialContent) ? params.initialContent[0] : params.initialContent;

  const isEditing = mode === 'edit' && !!postId;
  const isReposting = mode === 'repost' && !!postId;
  const isPostingInCommunity = !isEditing && !isReposting && !!communityId;
  const draftSource = isEditing ? `edit:${postId}` : isReposting ? `repost:${postId}` : 'new';

  const [draft, setDraft] = useState<DraftState>(() => ({
    source: isEditing ? null : draftSource,
    value: initialContent ?? '',
  }));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const textareaRef = useRef<TextInput>(null);

  const handleSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSelectionStart(e.nativeEvent.selection.start);
  };

  const handleMentionSelect = (newText: string, newCursorPosition: number) => {
    setContent(newText);
    setSelectionStart(newCursorPosition);
    setTimeout(() => {
      textareaRef.current?.setNativeProps({ selection: { start: newCursorPosition, end: newCursorPosition } });
    }, 0);
  };

  const postQuery = useQuery({
    queryKey: postQueryKey(postId ?? ''),
    queryFn: () => api<Post>(`/api/posts/${postId}`),
    enabled: isEditing || isReposting,
  });

  const content =
    isEditing && postQuery.data?.content && draft.source !== draftSource
      ? postQuery.data.content
      : draft.value;

  const setContent = (value: string) => {
    setDraft({ source: draftSource, value });
  };

  const remaining = 1000 - content.length;
  const existingImageUri = isEditing ? getMediaUri(postQuery.data?.imageUrl ?? null) : null;
  const previewUri = selectedImage?.localUri ?? existingImageUri;

  const originalPost = isReposting
    ? (postQuery.data?.repostOf ?? postQuery.data ?? null)
    : null;

  const validationError = useMemo(() => {
    const normalized = normalizePostContent(content);
    if (!normalized) return 'seu post não pode ficar vazio.';
    if (normalized.length > 1000) return 'seu post passou do limite de 1000 caracteres.';
    return null;
  }, [content]);

  const mutation = useMutation({
    mutationFn: async () => {
      const normalized = normalizePostContent(content);

      if (isEditing && postId) {
        return api<EditResponse>(`/api/posts/${postId}`, {
          method: 'PATCH',
          body: JSON.stringify({ content: normalized }),
        });
      }

      if (isReposting && postId) {
        const originalId = postQuery.data?.repostOf?.id ?? postId;
        return api<Post>(`/api/posts/${originalId}/repost`, {
          method: 'POST',
          body: JSON.stringify({ content: normalized }),
        });
      }

      return api<Post>('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          content: normalized,
          imageUrl: selectedImage?.remoteUrl,
          communityId: communityId ?? undefined,
        }),
      });
    },
    onSuccess: (result) => {
      if (isEditing && postId) {
        queryClient.setQueryData<Post>(postQueryKey(postId), (old) =>
          old
            ? {
                ...old,
                content: (result as EditResponse).content,
                updatedAt: (result as EditResponse).updatedAt,
              }
            : old
        );
        queryClient.setQueryData(feedQueryKey, (old: unknown) =>
          mapInfinitePosts(
            old as { pages: Array<{ posts: Post[]; nextCursor: string | null }>; pageParams: Array<string | null> } | undefined,
            (item) =>
              item.id === postId
                ? { ...item, content: (result as EditResponse).content, updatedAt: (result as EditResponse).updatedAt }
                : item
          )
        );
      } else if (isReposting && postId) {
        const originalId = postQuery.data?.repostOf?.id ?? postId;
        queryClient.setQueryData(feedQueryKey, (old: unknown) =>
          mapInfinitePosts(
            old as { pages: Array<{ posts: Post[]; nextCursor: string | null }>; pageParams: Array<string | null> } | undefined,
            (item) =>
              item.id === originalId
                ? { ...item, repostedByMe: true, _count: { ...item._count, reposts: item._count.reposts + 1 } }
                : item
          )
        );
        queryClient.invalidateQueries({ queryKey: feedQueryKey });
      } else if (isPostingInCommunity && communityId) {
        queryClient.invalidateQueries({ queryKey: ['community-feed', communityId] });
        queryClient.invalidateQueries({ queryKey: ['community-strip', communityId] });
      } else {
        queryClient.setQueryData(feedQueryKey, (old: unknown) =>
          prependFeedPost(
            old as { pages: Array<{ posts: Post[]; nextCursor: string | null }>; pageParams: Array<string | null> } | undefined,
            result as Post
          )
        );
      }

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/home');
      }
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message.toLowerCase());
      } else if (error instanceof Error) {
        setErrorMessage(error.message.toLowerCase());
      } else {
        setErrorMessage('não foi possível salvar agora.');
      }
    },
  });

  const handleSubmit = () => {
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    if (isUploadingImage) {
      setErrorMessage('espere o upload da imagem terminar.');
      return;
    }
    setErrorMessage(null);
    mutation.mutate();
  };

  const handlePickImage = async () => {
    if (isEditing || isReposting) {
      setErrorMessage('não é possível adicionar imagem neste modo.');
      return;
    }
    setErrorMessage(null);
    setIsUploadingImage(true);
    try {
      const asset = await pickImageFromLibrary({ allowsEditing: false, quality: 0.86 });
      if (!asset) return;
      const uploaded = await uploadImageAsset('/api/upload/post-image', asset);
      setSelectedImage({ localUri: asset.uri, remoteUrl: uploaded.url });
    } catch (error) {
      setErrorMessage(getUploadErrorMessage(error, 'não foi possível preparar a imagem agora.'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const headerTitle = isEditing
    ? 'editar post'
    : isReposting
      ? 'repostar com citação'
      : isPostingInCommunity && communityName
        ? `postar em ${communityName.toLowerCase()}`
        : 'postar no feed';

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Pressable onPress={() => router.back()}>
                <Text style={styles.headerAction}>voltar</Text>
              </Pressable>
              <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
              <Pressable disabled={mutation.isPending || isUploadingImage} onPress={handleSubmit}>
                {mutation.isPending || isUploadingImage ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.publishText}>{isReposting ? 'repostar' : 'publicar'}</Text>
                )}
              </Pressable>
            </View>

            {errorMessage ? <StatusNotice tone="error" message={errorMessage} /> : null}

            <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <TextInput
                ref={textareaRef}
                multiline
                value={content}
                onChangeText={setContent}
                onSelectionChange={handleSelectionChange}
                placeholder={isReposting ? 'adicione sua citação...' : 'no que você está pensando?'}
                placeholderTextColor={colors.textSoft}
                textAlignVertical="top"
                style={styles.textarea}
                maxLength={1000}
                autoFocus
              />

              {!isReposting && (
                <MentionTypeahead
                  text={content}
                  selectionStart={selectionStart}
                  onSelect={handleMentionSelect}
                />
              )}

              {isReposting && originalPost ? (
                <View style={styles.repostPreview}>
                  <Text style={styles.repostPreviewAuthor}>@{originalPost.author.username}</Text>
                  <Text style={styles.repostPreviewContent} numberOfLines={5}>{originalPost.content}</Text>
                  {originalPost.imageUrl ? (
                    <Image
                      source={{ uri: getMediaUri(originalPost.imageUrl) ?? '' }}
                      style={styles.repostPreviewImage}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
              ) : null}

              {!isReposting && (
                <View style={styles.toolbarRow}>
                  <Pressable
                    disabled={mutation.isPending || isUploadingImage || isEditing}
                    onPress={handlePickImage}
                    style={[styles.photoButton, (mutation.isPending || isUploadingImage || isEditing) ? styles.photoButtonDisabled : null]}
                    accessibilityLabel="inserir imagem"
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                      <Ionicons name="image-outline" size={24} color={colors.text} />
                    )}
                  </Pressable>
                  <Text style={styles.counter}>{remaining}</Text>
                </View>
              )}

              {previewUri && !isReposting ? (
                <Image source={{ uri: previewUri }} style={styles.previewImage} contentFit="contain" transition={200} alt="" />
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  headerAction: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  headerTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  publishText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  scrollArea: { flex: 1 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.md },
  textarea: {
    minHeight: 160,
    maxHeight: 320,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10, 12, 28, 0.88)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  repostPreview: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.28)',
    backgroundColor: 'rgba(19, 23, 48, 0.72)',
    padding: spacing.md,
    gap: spacing.xs,
  },
  repostPreviewAuthor: { color: colors.text, fontSize: 13, fontWeight: '700' },
  repostPreviewContent: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  repostPreviewImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
  },
  previewImage: {
    width: '100%',
    height: 320,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  photoButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.24)',
    backgroundColor: 'rgba(139, 61, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonDisabled: { opacity: 0.6 },
  counter: { color: colors.textSoft, fontSize: 13, fontWeight: '600' },
});
