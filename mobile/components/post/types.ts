export type Post = {
  id: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    profileImageUrl: string | null;
    gender: string | null;
  };
  community: {
    id: string;
    name: string;
    slug: string;
  } | null;
  replyTo: {
    id: string;
    content: string;
    author: {
      id: string;
      username: string;
    };
  } | null;
  repostOf: {
    id: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    author: { id: string; username: string; profileImageUrl: string | null; gender: string | null };
    community: { id: string; name: string; slug: string } | null;
    _count: { likes: number; comments: number; reposts: number };
  } | null;
  likedByMe: boolean;
  repostedByMe: boolean;
  _count: {
    likes: number;
    comments: number;
    reposts: number;
  };
};

export type PostsPage = {
  posts: Post[];
  nextCursor: string | null;
};

export type RepliesPage = {
  replies: Post[];
  nextCursor: string | null;
};

export const feedQueryKey = ['posts', 'feed'] as const;

export const postQueryKey = (postId: string) => ['posts', 'detail', postId] as const;

export const repliesQueryKey = (postId: string) => ['posts', 'replies', postId] as const;
