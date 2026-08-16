import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Image, type ImageLoadEventData } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiClientError, api } from '../../lib/api/client';
import { colors, radius, spacing } from '../ui/theme';
import { PostActionsSheet } from './PostActionsSheet';
import { CommunityInviteCard } from './CommunityInviteCard';
import { linkifyNative } from './Linkify';
import {
  formatRelativeTime,
  getAvatarLabel,
  getPostImageUri,
  getCommunityInviteToken,
  stripCommunityInviteLinks,
  mapInfinitePosts,
} from './post-utils';
import { feedQueryKey, postQueryKey, repliesQueryKey, type Post, type PostsPage } from './types';

type PostCardProps = {
  post: Post;
  currentUserId?: string;
  isAdmin?: boolean;
  compact?: boolean;
  disablePress?: boolean;
  hideReplyContext?: boolean;
  onCommentPress?: (post: Post) => void;
  onDeleted?: (postId: string) => void;
};

export function PostCard({
  post,
  currentUserId,
  compact = false,
  disablePress = false,
  hideReplyContext = false,
  onCommentPress,
  onDeleted,
}: PostCardProps) {
  const queryClient = useQueryClient();
  const canManage = currentUserId === post.author.id;
  const imageUri = getPostImageUri(post.imageUrl);
  const communityInviteToken = getCommunityInviteToken(post.content);
  const displayContent = stripCommunityInviteLinks(post.content);
  const repostTargetId = post.repostOf?.id ?? post.id;

  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; right: number } | null>(null);
  const moreButtonRef = useRef<View>(null);

  const [likedByMe, setLikedByMe] = useState(post.likedByMe);
  const [likesCount, setLikesCount] = useState(post._count.likes);
  const mutatingRef = useRef(false);

  useEffect(() => {
    if (!mutatingRef.current) {
      setLikedByMe(post.likedByMe);
      setLikesCount(post._count.likes);
    }
  }, [post.likedByMe, post._count.likes]);

  const handleImageLoad = (event: ImageLoadEventData) => {
    const { width, height } = event.source;
    if (width > 0 && height > 0) {
      setImageAspectRatio(width / height);
    }
  };

  const likeMutation = useMutation({
    mutationFn: async (nextLiked: boolean) => {
      if (nextLiked) {
        await api(`/api/posts/${post.id}/like`, { method: 'POST' });
      } else {
        await api(`/api/posts/${post.id}/like`, { method: 'DELETE' });
      }
    },
    onMutate: (nextLiked) => {
      mutatingRef.current = true;
      const prev = { likedByMe, likesCount };
      setLikedByMe(nextLiked);
      setLikesCount(
        nextLiked
          ? likesCount + (likedByMe ? 0 : 1)
          : Math.max(0, likesCount - (likedByMe ? 1 : 0))
      );
      return prev;
    },
    onError: (_error, _variables, context) => {
      if (context) {
        setLikedByMe(context.likedByMe);
        setLikesCount(context.likesCount);
      }
    },
    onSettled: () => {
      mutatingRef.current = false;
      queryClient.invalidateQueries({ queryKey: postQueryKey(post.id) });
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      if (post.replyTo?.id) {
        queryClient.invalidateQueries({ queryKey: repliesQueryKey(post.replyTo.id) });
      }
    },
  });

  const repostMutation = useMutation({
    mutationFn: async ({ content, undo }: { content: string; undo?: boolean }) => {
      if (undo) {
        await api(`/api/posts/${repostTargetId}/repost`, { method: 'DELETE' });
        return { undone: true };
      }
      return api<Post>(`/api/posts/${repostTargetId}/repost`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: (_result, variables) => {
      const undone = !!variables.undo;
      queryClient.setQueryData(feedQueryKey, (old: unknown) =>
        mapInfinitePosts(old as { pages: PostsPage[]; pageParams: Array<string | null> } | undefined, (item) => {
          if (item.id === repostTargetId) {
            return {
              ...item,
              repostedByMe: !undone,
              _count: { ...item._count, reposts: (item._count.reposts ?? 0) + (undone ? -1 : 1) },
            };
          }
          return item;
        })
      );
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
    },
  });

  const handleRepostPress = () => {
    if (post.repostedByMe) {
      repostMutation.mutate({ content: '', undo: true });
      return;
    }
    router.push({
      pathname: '/criar',
      params: { mode: 'repost', postId: repostTargetId },
    });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api(`/api/posts/${post.id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedQueryKey });
      queryClient.invalidateQueries({ queryKey: postQueryKey(post.id) });
      if (post.replyTo?.id) {
        queryClient.invalidateQueries({ queryKey: repliesQueryKey(post.replyTo.id) });
      }
      onDeleted?.(post.id);
    },
  });

  const openDetail = () => {
    router.push(`/post/${post.id}`);
  };

  const openProfile = () => {
    router.push(`/usuario/${post.author.username}`);
  };

  const handleLikePress = () => {
    if (mutatingRef.current) return;
    likeMutation.mutate(!likedByMe);
  };

  const handleCommentPress = () => {
    if (onCommentPress) {
      onCommentPress(post);
      return;
    }
    openDetail();
  };

  const openMoreMenu = () => {
    moreButtonRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      setAnchorPosition({
        top: y + height + 4,
        right: screenWidth - (x + width),
      });
      setActionsVisible(true);
    });
  };

  const handleEditAction = () => {
    router.push({
      pathname: '/criar',
      params: { mode: 'edit', postId: post.id },
    });
  };

  const handleDeleteAction = () => {
    deleteMutation.mutate();
  };

  return (
    <>
      <Pressable
        accessibilityRole={disablePress ? undefined : 'button'}
        onPress={disablePress ? undefined : openDetail}
        style={({ pressed }) => [
          styles.card,
          compact ? styles.cardCompact : null,
          pressed && !disablePress ? styles.cardPressed : null,
        ]}
      >
        <View style={styles.header}>
          <View style={styles.authorRow}>
            <Pressable onPress={openProfile} hitSlop={4}>
              {post.author.profileImageUrl ? (
                <Image source={{ uri: getPostImageUri(post.author.profileImageUrl) ?? '' }} style={styles.avatar} alt="" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarLabel}>{getAvatarLabel(post.author.username)}</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.authorMeta}>
              <Pressable onPress={openProfile} hitSlop={4}>
                <Text style={styles.username}>@{post.author.username}</Text>
              </Pressable>
              <Text style={styles.metaText}>
                {formatRelativeTime(post.createdAt)}
                {post.community ? ` · ${post.community.name}` : ''}
              </Text>
            </View>
          </View>

          {canManage ? (
            <Pressable
              ref={moreButtonRef}
              onPress={openMoreMenu}
              hitSlop={10}
              accessibilityLabel="mais ações"
              accessibilityRole="button"
              style={styles.moreButton}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {post.replyTo && !hideReplyContext ? (
          <View style={styles.replyContext}>
            <Text style={styles.replyContextText}>
              Respondendo a @{post.replyTo.author.username}: {post.replyTo.content}
            </Text>
          </View>
        ) : null}

        {displayContent ? <Text style={styles.content}>{linkifyNative(displayContent)}</Text> : null}

        {post.repostOf ? (
          <View style={styles.repostCard}>
            <Text style={styles.repostCardAuthor}>@{post.repostOf.author.username}</Text>
            <Text style={styles.repostCardContent} numberOfLines={4}>{post.repostOf.content}</Text>
            {post.repostOf.imageUrl ? (
              <Image source={{ uri: getPostImageUri(post.repostOf.imageUrl) ?? '' }} style={styles.repostCardImage} contentFit="cover" />
            ) : null}
          </View>
        ) : null}

        {communityInviteToken ? (
          <CommunityInviteCard token={communityInviteToken} compact={compact} />
        ) : null}

        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={[styles.postImage, imageAspectRatio ? { aspectRatio: imageAspectRatio } : null]}
            contentFit="contain"
            alt=""
            transition={200}
            onLoad={handleImageLoad}
          />
        ) : null}

        <View style={styles.footer}>
          <Pressable onPress={handleLikePress} style={styles.footerAction}>
            <Ionicons
              name={likedByMe ? 'heart' : 'heart-outline'}
              size={22}
              color={likedByMe ? '#ff4666' : colors.textMuted}
            />
            <Text style={[styles.footerText, likedByMe ? styles.footerTextActive : null]}>
              {likesCount}
            </Text>
          </Pressable>

          <Pressable onPress={handleCommentPress} style={styles.footerAction}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            <Text style={styles.footerText}>{post._count.comments}</Text>
          </Pressable>

          {currentUserId ? (
            <Pressable onPress={handleRepostPress} style={styles.footerAction} disabled={repostMutation.isPending}>
              <Ionicons
                name="refresh-outline"
                size={22}
                color={post.repostedByMe ? colors.primary : colors.textMuted}
              />
              {(post._count.reposts ?? 0) > 0 ? (
                <Text style={[styles.footerText, post.repostedByMe ? styles.footerReposted : null]}>
                  {post._count.reposts}
                </Text>
              ) : null}
            </Pressable>
          ) : null}
        </View>

        {deleteMutation.error instanceof ApiClientError ? (
          <Text style={styles.errorText}>{deleteMutation.error.message}</Text>
        ) : null}
      </Pressable>

      <PostActionsSheet
        visible={actionsVisible}
        onClose={() => setActionsVisible(false)}
        onEdit={handleEditAction}
        onDelete={handleDeleteAction}
        anchorPosition={anchorPosition}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.16)',
    backgroundColor: 'rgba(10, 12, 28, 0.88)',
    padding: spacing.md,
    gap: spacing.md,
  },
  cardCompact: {
    padding: spacing.sm,
  },
  cardPressed: {
    opacity: 0.96,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  authorRow: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSoft,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.28)',
  },
  avatarLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  authorMeta: {
    flex: 1,
    gap: 4,
  },
  username: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  moreButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyContext: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(19, 23, 48, 0.72)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  replyContextText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  footerTextActive: {
    color: '#ff4666',
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },
  repostCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(19, 23, 48, 0.72)',
    padding: spacing.sm,
    gap: 6,
  },
  repostCardAuthor: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  repostCardContent: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  repostCardImage: {
    width: '100%',
    height: 160,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSoft,
  },
  footerReposted: {
    color: colors.primary,
    fontWeight: '700',
  },
});
