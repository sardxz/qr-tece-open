import type { InfiniteData } from '@tanstack/react-query';
import { API_BASE_URL } from '../../lib/config';
import type { Post, PostsPage, RepliesPage } from './types';

const BLOCKED_LINK_REGEX =
  /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|br|io|co|app|dev|info|biz)(\/|\s|$)/i;

export const COMMUNITY_INVITE_URL_REGEX =
  /tece:\/\/convite\/comunidade\/([a-zA-Z0-9_-]{16,})/g;

export function getCommunityInviteToken(value: string) {
  COMMUNITY_INVITE_URL_REGEX.lastIndex = 0;
  return COMMUNITY_INVITE_URL_REGEX.exec(value)?.[1] ?? null;
}

export function stripCommunityInviteLinks(value: string) {
  return value.replace(COMMUNITY_INVITE_URL_REGEX, '').trim();
}

export function hasBlockedLink(value: string) {
  return BLOCKED_LINK_REGEX.test(stripCommunityInviteLinks(value));
}

export function normalizePostContent(value: string) {
  return value.trim();
}

export function formatRelativeTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `há ${diffMinutes}min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `há ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `há ${diffDays}d`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `há ${diffWeeks}sem`;
  }

  const date = new Date(isoDate);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function getPostImageUri(imageUrl: string | null) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  return `${API_BASE_URL}${imageUrl}`;
}

export function getAvatarLabel(username: string) {
  return username.slice(0, 1).toUpperCase();
}

export function mapInfinitePosts(
  data: InfiniteData<PostsPage, string | null> | undefined,
  updater: (post: Post) => Post
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map(updater),
    })),
  };
}

export function mapInfiniteReplies(
  data: InfiniteData<RepliesPage, string | null> | undefined,
  updater: (post: Post) => Post
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      replies: page.replies.map(updater),
    })),
  };
}

export function prependFeedPost(
  data: InfiniteData<PostsPage, string | null> | undefined,
  post: Post
): InfiniteData<PostsPage, string | null> {
  if (!data) {
    return {
      pageParams: [null],
      pages: [{ posts: [post], nextCursor: null }],
    };
  }

  const [firstPage, ...restPages] = data.pages;
  return {
    ...data,
    pages: [{ ...firstPage, posts: [post, ...firstPage.posts] }, ...restPages],
  };
}

export function removePostFromFeed(
  data: InfiniteData<PostsPage, string | null> | undefined,
  postId: string
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.filter((post) => post.id !== postId),
    })),
  };
}

export function removeReplyFromReplies(
  data: InfiniteData<RepliesPage, string | null> | undefined,
  postId: string
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      replies: page.replies.filter((post) => post.id !== postId),
    })),
  };
}

export function updatePostLikeState(post: Post, likedByMe: boolean) {
  const likes = likedByMe
    ? post._count.likes + (post.likedByMe ? 0 : 1)
    : Math.max(0, post._count.likes - (post.likedByMe ? 1 : 0));

  return {
    ...post,
    likedByMe,
    _count: {
      ...post._count,
      likes,
    },
  };
}
