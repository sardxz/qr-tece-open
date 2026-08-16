export type UserRole = "USER" | "ADMIN";
export type PresenceStatus = "online" | "busy" | "away" | "offline";
export type DepoStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MemberRole = "MEMBER" | "MOD" | "OWNER";
export type Gender = "H" | "M";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
};

export type PublicUser = {
  id: string;
  username: string;
  gender: Gender;
  bio: string | null;
  city: string | null;
  state: string | null;
  birthYear: number | null;
  profilePhrase: string | null;
  createdAt: string;
};

export type PostWithAuthor = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  replyTo?: {
    id: string;
    content: string;
    author: { id: string; username: string };
  } | null;
  repostOf?: {
    id: string;
    content: string;
    imageUrl?: string | null;
    createdAt: string;
    author: { id: string; username: string; profileImageUrl?: string | null; gender?: string | null };
    community?: { id: string; name: string; slug: string } | null;
    _count: { likes: number; comments: number; reposts?: number };
  } | null;
  author: {
    id: string;
    username: string;
    profileImageUrl?: string | null;
    gender?: string | null;
  };
  community?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count: {
    likes: number;
    comments: number;
    reposts?: number;
  };
  likedByMe?: boolean;
  repostedByMe?: boolean;
};

export type ProfileUser = {
  username: string;
  profilePhrase: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  birthYear: number | null;
  createdAt: string;
  gender: "H" | "M";
  profileImageUrl: string | null;
  profileCoverUrl: string | null;
  statusText: string | null;
  reputationScore: number;
  invitedBy: {
    username: string;
    gender: Gender;
    profileImageUrl: string | null;
    reputationScore: number;
  } | null;
  invitedUsersCount: number;
};

export type ProfileStats = {
  depos: number;
  badges: number;
  communities: number;
  likesReceived: number;
  friends: number;
};

export type FriendState =
  | { type: "none" }
  | { type: "sent"; id: string }
  | { type: "received"; id: string }
  | { type: "friends"; id: string };

export type ReplyWithAuthor = {
  id: string;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  author: {
    id: string;
    username: string;
    profileImageUrl?: string | null;
    gender?: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
  likedByMe?: boolean;
};

export type PostCounts = Record<string, { likes: number; comments: number }>;

export type DepoWithAuthor = {
  id: string;
  content: string;
  status: DepoStatus;
  createdAt: string;
  approvedAt: string | null;
  author: {
    id: string;
    username: string;
  };
};

export type ReplyTarget = {
  id: string;
  username: string;
  content: string;
};

export type Rarity = "common" | "rare" | "epic" | "legendary";

export type ShowcaseItem = {
  id: string;
  type: "badge" | "collectible" | "community";
  name: string;
  icon: string;
  rarity?: Rarity;
  editionNumber?: number | null;
  totalSupply?: number | null;
  href?: string;
};

export type ShowcaseCollectionItem = {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  editionNumber?: number | null;
  totalSupply?: number | null;
};

export type TimelineEvent = {
  id: string;
  icon: string;
  description: string;
  date: string;
  iconColor?: string;
  iconBg?: string;
};

export type CommunityWithCount = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string;
  createdAt: string;
  createdBy: {
    username: string;
  };
  _count: {
    members: number;
    posts: number;
  };
};
