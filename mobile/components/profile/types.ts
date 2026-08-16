export type FriendState =
  | { type: 'none' }
  | { type: 'sent'; id: string }
  | { type: 'received'; id: string }
  | { type: 'friends'; id: string };

export type PresenceStatus = 'online' | 'busy' | 'away' | 'offline';

export type ProfileResponse = {
  user: {
    id: string;
    username: string;
    profilePhrase: string | null;
    bio: string | null;
    city: string | null;
    state: string | null;
    birthYear: number | null;
    createdAt: string;
    gender: string | null;
    profileImageUrl: string | null;
    profileCoverUrl: string | null;
    reputationScore: number | null;
    statusText: string | null;
    invitedBy: {
      username: string;
      gender: string | null;
      profileImageUrl: string | null;
      reputationScore: number | null;
    } | null;
    invitedUsersCount: number;
  };
  stats: {
    depos: number;
    badges: number;
    communities: number;
    likesReceived: number;
    friends: number;
  };
  presenceStatus: PresenceStatus;
  isOwnProfile: boolean;
  friendState: FriendState;
  pendingDeposCount: number;
};

export type TopFriendsResponse = {
  friends: Array<{
    position: number;
    id: string;
    username: string;
    gender: string | null;
    profile_image_url: string | null;
  }>;
  is_owner: boolean;
};

export type TimelineResponse = {
  events: Array<{
    id: string;
    type: string;
    text: string;
    date: string;
  }>;
};

export type DeposResponse = {
  depos: Array<{
    id: string;
    content: string;
    approvedAt: string;
    author: {
      username: string;
      profileImageUrl: string | null;
      gender: string | null;
    };
  }>;
  total: number;
  page: number;
  totalPages: number;
};

export type FriendsResponse = {
  friends: Array<{
    id: string;
    friendshipId?: string;
    username: string;
    gender: string | null;
    profileImageUrl: string | null;
    statusText?: string | null;
    profilePhrase?: string | null;
    bio?: string | null;
    city?: string | null;
    state?: string | null;
    presenceStatus?: PresenceStatus;
    friendsSince?: string;
    commonCommunities?: Array<{
      id: string;
      name: string;
      slug: string;
    }>;
  }>;
  total?: number;
  page?: number;
  totalPages?: number;
};

export type FriendRequestsResponse = {
  requests: Array<{
    id: string;
    requester: {
      id: string;
      username: string;
      gender: string | null;
    };
  }>;
};

export type SiteUpdatesResponse = {
  updates: Array<{
    id: string;
    content: string;
    type: 'FEATURE' | 'FIX' | 'BUG';
    createdAt: string;
    author: { username: string };
    likeCount: number;
    likedByMe: boolean;
  }>;
};

export type ReceivedDeposResponse = {
  pending: Array<{
    id: string;
    content: string;
    status: 'PENDING' | 'APPROVED' | string;
    createdAt: string;
    approvedAt: string | null;
    author: {
      username: string;
      profileImageUrl: string | null;
      gender: string | null;
    };
  }>;
  approved: Array<{
    id: string;
    content: string;
    status: 'PENDING' | 'APPROVED' | string;
    createdAt: string;
    approvedAt: string | null;
    author: {
      username: string;
      profileImageUrl: string | null;
      gender: string | null;
    };
  }>;
};

export type ActivityResponse = {
  items: Array<
    | {
        type: 'mention';
        id: string;
        date: string;
        isNew: boolean;
        targetPostId?: string;
        targetCommunitySlug?: string | null;
        post: {
          id: string;
          content: string;
          author: {
            username: string;
            profileImageUrl: string | null;
            gender: string | null;
          };
          community: {
            id: string;
            name: string;
            slug: string;
          } | null;
        };
      }
    | {
        type: 'comment';
        id: string;
        date: string;
        isNew: boolean;
        targetPostId?: string;
        reply: {
          id: string;
          content: string;
          author: {
            username: string;
            profileImageUrl: string | null;
            gender: string | null;
          };
        };
        parent: {
          id: string;
          content: string;
          community: {
            id: string;
            name: string;
            slug: string;
          } | null;
        };
      }
    | {
        type: 'depo';
        id: string;
        date: string;
        isNew: boolean;
        depo: {
          id: string;
          content: string;
          status: string;
          author: {
            username: string;
            profileImageUrl: string | null;
            gender: string | null;
          };
        };
      }
    | {
        type: 'friendRequest';
        id: string;
        date: string;
        isNew: boolean;
        friendshipId: string;
        requester: {
          username: string;
          profileImageUrl: string | null;
          gender: string | null;
        };
      }
    | {
        type: 'like';
        id: string;
        date: string;
        isNew: boolean;
        targetPostId?: string;
        user: {
          username: string;
          profileImageUrl: string | null;
          gender: string | null;
        };
        post: {
          id: string;
          content: string;
          community: {
            id: string;
            name: string;
            slug: string;
          } | null;
        };
      }
  >;
  lastSeen: string | null;
  totalNew: number;
};

export type CollectionEntry = {
  id: string;
  name: string;
  icon_url: string | null;
  rarity: string | null;
};

export type CollectionResponse = {
  badges: CollectionEntry[];
  mascots: CollectionEntry[];
  items: CollectionEntry[];
  events: CollectionEntry[];
  special: CollectionEntry[];
};

// Vitrine de badges em destaque (GET /api/profile/{username}/showcase filtrado por BADGE)
export type ShowcaseBadge = {
  id: string;
  type: string;
  name: string;
  icon_url: string | null;
  rarity: string | null;
  position: number | null;
};

export type ShowcaseResponse = {
  items: ShowcaseBadge[];
  is_owner: boolean;
};

// Coleção própria do usuário com flags de vitrine (GET /api/users/me/collection)
export type MyCollectionBadge = {
  id: string;
  name: string;
  icon_url: string | null;
  rarity: string | null;
  acquired_at: string;
  is_highlighted: boolean;
  position: number | null;
};

export type MyCollectionResponse = {
  badges: MyCollectionBadge[];
};

export type AfilhadosResponse = {
  afilhados: Array<{
    id: string;
    username: string;
    gender: string | null;
    profileImageUrl: string | null;
  }>;
};

export const profileQueryKey = (username: string) => ['profile', username] as const;
export const topFriendsQueryKey = (username: string) => ['profile', username, 'top-friends'] as const;
export const timelineQueryKey = (username: string) => ['profile', username, 'timeline'] as const;
export const deposQueryKey = (username: string) => ['profile', username, 'depos'] as const;
export const collectionQueryKey = (username: string) => ['profile', username, 'collection'] as const;
export const showcaseQueryKey = (username: string) => ['profile', username, 'showcase'] as const;
export const afilhadosQueryKey = (username: string) => ['profile', username, 'afilhados'] as const;
export const myCollectionQueryKey = ['me', 'collection'] as const;
export const friendsQueryKey = ['friends'] as const;
export const userFriendsQueryKey = (username: string) => ['friends', 'of', username] as const;
export const friendRequestsQueryKey = ['friends', 'requests'] as const;
export const siteUpdatesQueryKey = ['updates'] as const;
export const receivedDeposQueryKey = ['depos', 'recebidos'] as const;
export const activityQueryKey = ['activity'] as const;
