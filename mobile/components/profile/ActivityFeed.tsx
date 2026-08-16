import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiClientError, api } from '../../lib/api/client';
import { colors, radius, spacing } from '../ui/theme';
import { ProfileAvatar } from './ProfileAvatar';
import { formatActivityDate } from './profile-utils';
import { activityQueryKey, friendRequestsQueryKey, friendsQueryKey, type ActivityResponse } from './types';

type ActivityFeedProps = {
  activity: ActivityResponse;
};

type ActivityPostTarget = {
  id: string;
  community?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

function openActivityTarget(target: ActivityPostTarget, fallbackPostId?: string) {
  if (target.community?.id && target.community.slug) {
    router.push({
      pathname: '/comunidade/[slug]',
      params: {
        slug: target.community.slug,
        communityId: target.community.id,
        name: target.community.name,
        coverImageUrl: '',
        memberCount: '',
      },
    });
    return;
  }

  router.push(`/post/${fallbackPostId ?? target.id}`);
}

export function ActivityFeed({ activity }: ActivityFeedProps) {
  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'reject' }) =>
      api(`/api/friends/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityQueryKey });
      queryClient.invalidateQueries({ queryKey: friendRequestsQueryKey });
      queryClient.invalidateQueries({ queryKey: friendsQueryKey });
    },
  });

  const renderItem = ({ item }: { item: ActivityResponse['items'][number] }) => {
    if (item.type === 'friendRequest') {
      return (
        <View style={styles.itemCard}>
          <RowHeader username={item.requester.username} imageUrl={item.requester.profileImageUrl} badge={item.isNew ? 'novo' : undefined} date={formatActivityDate(item.date)} />
          <Text style={styles.itemText}>quer se conectar com você no qr.tecê.</Text>
          <View style={styles.actionsRow}>
            <Pressable onPress={() => requestMutation.mutate({ id: item.friendshipId, action: 'accept' })} style={styles.acceptButton}>
              <Text style={styles.acceptText}>aceitar</Text>
            </Pressable>
            <Pressable onPress={() => requestMutation.mutate({ id: item.friendshipId, action: 'reject' })} style={styles.rejectButton}>
              <Text style={styles.rejectText}>recusar</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (item.type === 'mention') {
      const community = item.post.community;

      return (
        <Pressable onPress={() => openActivityTarget(item.post, item.targetPostId)} style={styles.itemCard}>
          <RowHeader username={item.post.author.username} imageUrl={item.post.author.profileImageUrl} badge={item.isNew ? 'novo' : undefined} date={formatActivityDate(item.date)} />
          <Text style={styles.itemText}>
            mencionou você em um post{community?.name ? ` em ${community.name.toLowerCase()}` : ''}.
          </Text>
          <Text style={styles.previewText}>{item.post.content}</Text>
        </Pressable>
      );
    }

    if (item.type === 'comment') {
      return (
        <Pressable onPress={() => openActivityTarget(item.parent, item.targetPostId)} style={styles.itemCard}>
          <RowHeader username={item.reply.author.username} imageUrl={item.reply.author.profileImageUrl} badge={item.isNew ? 'novo' : undefined} date={formatActivityDate(item.date)} />
          <Text style={styles.itemText}>respondeu um post seu.</Text>
          <Text style={styles.previewText}>{item.reply.content}</Text>
        </Pressable>
      );
    }

    if (item.type === 'like') {
      return (
        <Pressable onPress={() => openActivityTarget(item.post, item.targetPostId)} style={styles.itemCard}>
          <RowHeader username={item.user.username} imageUrl={item.user.profileImageUrl} badge={item.isNew ? 'novo' : undefined} date={formatActivityDate(item.date)} />
          <Text style={styles.itemText}>curtiu um post seu.</Text>
          <Text style={styles.previewText}>{item.post.content}</Text>
        </Pressable>
      );
    }

    return (
      <Pressable onPress={() => router.push('/depos-recebidos')} style={styles.itemCard}>
        <RowHeader username={item.depo.author.username} imageUrl={item.depo.author.profileImageUrl} badge={item.isNew ? 'novo' : undefined} date={formatActivityDate(item.date)} />
        <Text style={styles.itemText}>deixou um depo para você.</Text>
        <Text style={styles.previewText}>{item.depo.content}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <FlashList
        data={activity.items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>nenhuma atividade por enquanto.</Text>
          </View>
        }
        ListFooterComponent={
          requestMutation.isPending ? (
            <View style={styles.footerState}>
              <ActivityIndicator color={colors.primaryStrong} />
            </View>
          ) : null
        }
      />

      {requestMutation.error instanceof ApiClientError ? <Text style={styles.errorText}>{requestMutation.error.message.toLowerCase()}</Text> : null}
    </View>
  );
}

function RowHeader({ username, imageUrl, date, badge }: { username: string; imageUrl: string | null; date: string; badge?: string }) {
  const openProfile = () => router.push(`/usuario/${username}`);
  return (
    <View style={styles.rowHeader}>
      <Pressable onPress={openProfile} hitSlop={4}>
        <ProfileAvatar username={username} imageUrl={imageUrl} size={44} />
      </Pressable>
      <View style={styles.rowMeta}>
        <View style={styles.rowTitle}>
          <Pressable onPress={openProfile} hitSlop={4}>
            <Text style={styles.rowUsername}>@{username}</Text>
          </Pressable>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.rowDate}>{date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  listContent: { paddingBottom: 120 },
  itemCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowMeta: { flex: 1, gap: 3 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowUsername: { color: colors.text, fontSize: 15, fontWeight: '700' },
  badge: { color: colors.primaryStrong, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  rowDate: { color: colors.textSoft, fontSize: 12 },
  itemText: { color: colors.text, fontSize: 15, lineHeight: 20 },
  previewText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  acceptButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  rejectButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  emptyWrap: { paddingTop: spacing.xl, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  footerState: { paddingVertical: spacing.sm },
  errorText: { color: colors.error, fontSize: 13 },
});
