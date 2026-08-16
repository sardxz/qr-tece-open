import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getMediaUri } from '../profile/profile-utils';
import { colors, radius, spacing } from '../ui/theme';

export type CommunityListItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverImageUrl: string | null;
  isPrivate?: boolean;
  isJoined?: boolean;
  locked?: boolean;
  myRole?: 'OWNER' | 'MOD' | 'MEMBER' | null;
  memberCount?: number;
  postCount?: number;
  recentPostCount?: number;
  createdBy?: {
    username: string;
  };
};

type CommunityCardProps = {
  community: CommunityListItem;
  onPress?: () => void;
  compact?: boolean;
};

export function CommunityCard({ community, onPress, compact = false }: CommunityCardProps) {
  const coverUri = getMediaUri(community.coverImageUrl);
  const badgeLabel =
    community.myRole === 'OWNER'
      ? 'MINHA'
      : community.myRole === 'MOD' || community.myRole === 'MEMBER'
        ? 'MEMBRO'
        : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, compact ? styles.cardCompact : null, pressed ? styles.pressed : null]}>
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={compact ? styles.coverCompact : styles.cover} contentFit="cover" transition={200} />
      ) : (
        <View style={[compact ? styles.coverCompact : styles.cover, styles.coverFallback]}>
          <Text style={styles.fallbackLabel}>#{community.slug}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={2}>{community.name}</Text>
          {badgeLabel ? <Text style={styles.joinedBadge}>{badgeLabel}</Text> : null}
        </View>
        {community.locked ? (
          <View style={styles.lockedRow}>
            <Ionicons name="lock-closed-outline" size={15} color={colors.textMuted} />
            <Text style={styles.locked}>Fechada - so por convite</Text>
          </View>
        ) : (
          <>
            {community.description ? (
              <Text style={styles.description} numberOfLines={2}>{community.description}</Text>
            ) : null}
            <View style={styles.metaRow}>
              {typeof community.memberCount === 'number' ? (
                <Text style={styles.members}>
                  {community.memberCount} {community.memberCount === 1 ? 'membro' : 'membros'}
                </Text>
              ) : null}
              {typeof community.postCount === 'number' ? (
                <Text style={styles.members}>
                  {community.postCount} {community.postCount === 1 ? 'post' : 'posts'}
                </Text>
              ) : null}
            </View>
            {typeof community.recentPostCount === 'number' && community.recentPostCount > 0 ? (
              <Text style={styles.recent}>{community.recentPostCount} novos recentemente</Text>
            ) : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.18)',
    backgroundColor: 'rgba(10, 12, 28, 0.88)',
  },
  cardCompact: {
    width: 124,
  },
  pressed: {
    opacity: 0.96,
  },
  cover: {
    width: '100%',
    height: 128,
    backgroundColor: colors.surfaceSoft,
  },
  coverCompact: {
    width: '100%',
    height: 92,
    backgroundColor: colors.surfaceSoft,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  joinedBadge: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  members: {
    color: colors.textMuted,
    fontSize: 13,
  },
  recent: {
    color: colors.accentOrange,
    fontSize: 12,
    fontWeight: '700',
  },
  locked: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
