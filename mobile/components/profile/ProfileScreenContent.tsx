import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiClientError, api } from '../../lib/api/client';
import { API_BASE_URL } from '../../lib/config';
import { getUploadErrorMessage, pickImageFromLibrary, uploadImageAsset } from '../upload/image-upload';
import { StatusNotice } from '../ui/StatusNotice';
import { colors, fonts, radius, spacing } from '../ui/theme';
import { FriendStateButton, FriendStateError } from './FriendStateButton';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileStatusSheet } from './ProfileStatusSheet';
import { formatProfileDate, formatTimelineDate, getMediaUri, getPresenceMeta, getReputationMeta } from './profile-utils';
import { linkifyNative } from '../post/Linkify';
import { BadgeShowcasePicker } from './BadgeShowcasePicker';
import {
  activityQueryKey,
  afilhadosQueryKey,
  collectionQueryKey,
  deposQueryKey,
  friendsQueryKey,
  profileQueryKey,
  showcaseQueryKey,
  timelineQueryKey,
  type AfilhadosResponse,
  type CollectionEntry,
  type CollectionResponse,
  type DeposResponse,
  type ProfileResponse,
  type ShowcaseResponse,
  type TimelineResponse,
} from './types';

type ProfileScreenContentProps = {
  username: string;
  allowOpenOwnTab?: boolean;
};

type UploadTarget = 'avatar' | 'cover';
type IoniconName = ComponentProps<typeof Ionicons>['name'];
type PrimaryBadgeInfo = {
  label: string;
  color: string;
  borderColor: string;
  gradient: [string, string, string];
  borderGradient: [string, string, string];
};
type ReputationProgressInfo = {
  score: number;
  currentLabel: string;
  nextLabel: string;
  target: number;
  remaining: number;
  percent: number;
  color: string;
};

export function ProfileScreenContent({ username }: ProfileScreenContentProps) {
  const queryClient = useQueryClient();
  const [depoContent, setDepoContent] = useState('');
  const [depoMessage, setDepoMessage] = useState<string | null>(null);
  const [depoError, setDepoError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<CollectionEntry | null>(null);
  const [showBadgePicker, setShowBadgePicker] = useState(false);

  const runProfileQuery = async <T,>(label: string, path: string) => {
    try {
      return await api<T>(path);
    } catch (error) {
      console.error(`[profile:${label}] falhou`, {
        username,
        path,
        apiBaseUrl: API_BASE_URL,
        error,
      });
      throw error;
    }
  };

  const [profileQuery, timelineQuery, deposQuery, collectionQuery, showcaseQuery, afilhadosQuery] = useQueries({
    queries: [
      {
        queryKey: profileQueryKey(username),
        queryFn: () => runProfileQuery<ProfileResponse>('profile', `/api/profile/${username}`),
      },
      {
        queryKey: timelineQueryKey(username),
        queryFn: () => runProfileQuery<TimelineResponse>('timeline', `/api/profile/${username}/timeline?limit=6`),
      },
      {
        queryKey: deposQueryKey(username),
        queryFn: () => runProfileQuery<DeposResponse>('depos', `/api/profile/${username}/depos?page=1&limit=5`),
      },
      {
        queryKey: collectionQueryKey(username),
        queryFn: () => runProfileQuery<CollectionResponse>('collection', `/api/profile/${username}/collection`),
      },
      {
        queryKey: showcaseQueryKey(username),
        queryFn: () => runProfileQuery<ShowcaseResponse>('showcase', `/api/profile/${username}/showcase`),
      },
      {
        queryKey: afilhadosQueryKey(username),
        queryFn: () => runProfileQuery<AfilhadosResponse>('afilhados', `/api/profile/${username}/afilhados`),
      },
    ],
  });

  const profile = profileQuery.data;
  const coverUri = getMediaUri(profile?.user.profileCoverUrl ?? null);

  const depoMutation = useMutation({
    mutationFn: async () =>
      api('/api/depos', {
        method: 'POST',
        body: JSON.stringify({ content: depoContent.trim(), recipientUsername: username }),
      }),
    onSuccess: () => {
      setDepoContent('');
      setDepoError(null);
      setDepoMessage('Depo enviado para aprovação.');
      queryClient.invalidateQueries({ queryKey: profileQueryKey(username) });
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setDepoError(error.message);
      } else if (error instanceof Error) {
        setDepoError(error.message);
      } else {
        setDepoError('Não foi possível enviar o depo.');
      }
    },
  });

  const profileImageMutation = useMutation({
    mutationFn: async ({ target }: { target: UploadTarget }) => {
      const asset = await pickImageFromLibrary({
        allowsEditing: true,
        aspect: target === 'avatar' ? [1, 1] : [4, 1],
        quality: target === 'avatar' ? 0.82 : 0.9,
      });

      if (!asset) {
        return null;
      }

      const path = target === 'avatar' ? '/api/upload/profile-image' : '/api/upload/profile-cover';
      const response = await uploadImageAsset(path, asset);

      return { target, url: response.url };
    },
    onSuccess: (result) => {
      if (!result) {
        return;
      }

      setUploadError(null);
      setUploadMessage(result.target === 'avatar' ? 'Foto de perfil atualizada.' : 'Capa atualizada.');
      queryClient.invalidateQueries({ queryKey: profileQueryKey(username) });
      queryClient.invalidateQueries({ queryKey: friendsQueryKey });
      queryClient.invalidateQueries({ queryKey: activityQueryKey });
    },
    onError: (error) => {
      setUploadMessage(null);
      setUploadError(
        getUploadErrorMessage(
          error,
          'Não foi possível enviar a imagem agora. Tente novamente em instantes.'
        )
      );
    },
  });

  const pendingState = useMemo(
    () => profileQuery.isLoading || timelineQuery.isLoading || deposQuery.isLoading,
    [profileQuery.isLoading, timelineQuery.isLoading, deposQuery.isLoading]
  );

  if (pendingState) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.primaryStrong} />
        <Text style={styles.stateText}>Carregando perfil do qr.tecê...</Text>
      </View>
    );
  }

  if (profileQuery.isError || !profile) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateTitle}>Não foi possível abrir este perfil</Text>
        <Text style={styles.stateText}>
          {profileQuery.error instanceof ApiClientError ? profileQuery.error.message : 'Tente novamente em instantes.'}
        </Text>
      </View>
    );
  }

  const activeUpload = profileImageMutation.isPending ? profileImageMutation.variables?.target ?? null : null;
  const presence = getPresenceMeta(profile.presenceStatus);
  const events = timelineQuery.data?.events ?? [];
  const depos = deposQuery.data?.depos ?? [];
  const totalDepos = deposQuery.data?.total ?? profile.stats.depos;
  const badges = collectionQuery.data?.badges ?? [];
  const primaryBadge = getPrimaryBadge(profile.user.reputationScore);
  const reputationInfo =
    profile.user.reputationScore !== null ? getReputationProgress(profile.user.reputationScore) : null;
  const highlightedBadges = (showcaseQuery.data?.items ?? []).filter((i) => i.type === 'badge').slice(0, 5);

  const location = [profile.user.city, profile.user.state].filter(Boolean).join(', ');

  const handleDepoSend = () => {
    const normalized = depoContent.trim();
    if (normalized.length < 10) {
      setDepoError('Seu depo precisa ter pelo menos 10 caracteres.');
      return;
    }
    if (normalized.length > 500) {
      setDepoError('Seu depo pode ter no máximo 500 caracteres.');
      return;
    }
    setDepoError(null);
    setDepoMessage(null);
    depoMutation.mutate();
  };

  const handleProfileImagePick = (target: UploadTarget) => {
    setUploadError(null);
    setUploadMessage(null);
    profileImageMutation.mutate({ target });
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHero}>
          <View style={styles.cover}>
            <View style={styles.coverMedia}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverImage} contentFit="cover" contentPosition="top" transition={200} />
              ) : (
                <View style={styles.coverFallback} />
              )}
            </View>

            {profile.isOwnProfile ? (
              <Pressable
                onPress={() => handleProfileImagePick('cover')}
                disabled={profileImageMutation.isPending}
                style={styles.coverAction}
              >
                {activeUpload === 'cover' ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={14} color={colors.text} />
                    <Text style={styles.coverActionText}>trocar capa</Text>
                  </>
                )}
              </Pressable>
            ) : null}

            <View style={[styles.avatarRing, { borderColor: presence.color }]}>
              {profile.isOwnProfile ? (
                <Pressable
                  onPress={() => handleProfileImagePick('avatar')}
                  disabled={profileImageMutation.isPending}
                  style={styles.avatarPressable}
                >
                  <ProfileAvatar username={profile.user.username} imageUrl={profile.user.profileImageUrl} size={92} />
                  <View style={styles.avatarBadge}>
                    {activeUpload === 'avatar' ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Ionicons name="camera" size={14} color={colors.white} />
                    )}
                  </View>
                </Pressable>
              ) : (
                <ProfileAvatar username={profile.user.username} imageUrl={profile.user.profileImageUrl} size={92} />
              )}
            </View>
          </View>

          <View style={styles.identityBlock}>
            <View style={styles.identityTopRow}>
              <View style={styles.identityNameBlock}>
                <Text style={styles.username} numberOfLines={1}>@{profile.user.username}</Text>
                <View style={styles.presencePill}>
                  <View style={[styles.presenceDot, { backgroundColor: presence.color }]} />
                  <Text style={[styles.presenceText, { color: presence.color }]}>{presence.label}</Text>
                </View>
              </View>
              <PrimaryBadge badge={primaryBadge} />
            </View>

            {profile.user.statusText ? (
              <Text style={styles.statusText}>{profile.user.statusText}</Text>
            ) : null}

            {location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.textSoft} />
                <Text style={styles.metaLine} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSoft} />
              <Text style={styles.metaLine} numberOfLines={1}>
                membro desde {formatProfileDate(profile.user.createdAt)}
              </Text>
            </View>

            {profile.user.invitedBy ? (
              <View style={styles.inviteLine}>
                <Ionicons name="sparkles-outline" size={14} color={colors.warning} />
                <Text style={styles.inviteText}>chegou por convite de @{profile.user.invitedBy.username}</Text>
              </View>
            ) : null}

            {profile.isOwnProfile ? (
              <Pressable
                onPress={() => setStatusSheetOpen(true)}
                style={({ pressed }) => [styles.editStatusBanner, pressed ? styles.editStatusBannerPressed : null]}
              >
                <Ionicons name="create-outline" size={18} color={colors.primaryStrong} />
                <Text style={styles.editStatusText}>editar status</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {uploadError ? <StatusNotice tone="error" message={uploadError} /> : null}
        {uploadMessage ? <StatusNotice tone="success" message={uploadMessage} /> : null}

        {!profile.isOwnProfile ? (
          <View style={styles.card}>
            <FriendStateButton
              username={profile.user.username}
              profileUsername={profile.user.username}
              state={profile.friendState}
            />
            <FriendStateError error={undefined} />
          </View>
        ) : null}

        <View style={styles.socialCard}>
          <SocialStat label="depos" value={profile.stats.depos} icon="happy-outline" withDivider />
          <SocialStat
            label="amigos"
            value={profile.stats.friends}
            icon="people-outline"
            withDivider
            onPress={() =>
              router.push(
                profile.isOwnProfile
                  ? '/amigos'
                  : { pathname: '/amigos', params: { username: profile.user.username } }
              )
            }
          />
          <SocialStat
            label="comus"
            value={profile.stats.communities}
            icon="planet-outline"
            withDivider
            onPress={() => router.push(`/comus/${profile.user.username}`)}
          />
          <SocialStat label="likes" value={profile.stats.likesReceived} icon="heart-outline" />
        </View>

        <View style={styles.card}>
          {profile.isOwnProfile && profile.pendingDeposCount > 0 ? (
            <Pressable style={styles.deposPendingStrip} onPress={() => router.push('/depos-recebidos')}>
              <Text style={styles.deposPendingText}>
                {profile.pendingDeposCount} depo{profile.pendingDeposCount > 1 ? 's' : ''} aguardando revisão
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#f59e0b" />
            </Pressable>
          ) : null}
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>depos</Text>
            {totalDepos > 5 ? (
              <Pressable onPress={() => router.push(`/depos/${username}`)}>
                <Text style={styles.linkText}>ver todos ({totalDepos})</Text>
              </Pressable>
            ) : null}
          </View>
          {depos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.depoRail}>
              {depos.map((depo) => (
                <View key={depo.id} style={styles.depoRailItem}>
                  <View style={styles.depoHeader}>
                    <ProfileAvatar username={depo.author.username} imageUrl={depo.author.profileImageUrl} size={36} />
                    <View style={styles.depoMeta}>
                      <Text style={styles.depoAuthor}>@{depo.author.username}</Text>
                      <Text style={styles.depoDate}>{formatProfileDate(depo.approvedAt)}</Text>
                    </View>
                  </View>
                  <Text style={styles.depoContent} numberOfLines={6}>{linkifyNative(depo.content)}</Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, styles.badgeSectionTitle]}>BADGES EM DESTAQUE</Text>
            {badges.length > 5 ? (
              <Pressable>
                <Text style={styles.linkText}>ver todos</Text>
              </Pressable>
            ) : null}
          </View>
          {highlightedBadges.length > 0 || profile.isOwnProfile ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRail}>
              {highlightedBadges.map((badge) => {
                const iconUri = getMediaUri(badge.icon_url);
                return (
                  <Pressable
                    key={badge.id}
                    onPress={() => setSelectedBadge(badge)}
                    style={styles.badgeChip}
                  >
                    {iconUri ? (
                      <Image source={{ uri: iconUri }} style={styles.badgeIcon} contentFit="contain" />
                    ) : (
                      <View style={[styles.badgeIcon, styles.badgeFallback]}>
                        <Ionicons name="ribbon-outline" size={36} color={colors.primaryStrong} />
                      </View>
                    )}
                    <Text style={styles.badgeLabel} numberOfLines={2}>{badge.name}</Text>
                  </Pressable>
                );
              })}
              {profile.isOwnProfile ? (
                <Pressable hitSlop={8} style={styles.addShowcaseBadge} onPress={() => setShowBadgePicker(true)}>
                  <Ionicons name="add" size={28} color={colors.primaryStrong} />
                </Pressable>
              ) : null}
            </ScrollView>
          ) : null}
        </View>

        {reputationInfo ? <ReputationPanel info={reputationInfo} /> : null}


        {!profile.isOwnProfile ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Deixar um depo</Text>
            <Text style={styles.sectionSubtitle}>
              Escreva algo generoso e direto. O depo vai para aprovação da pessoa.
            </Text>
            {depoError ? <StatusNotice tone="error" message={depoError} /> : null}
            {depoMessage ? <StatusNotice tone="success" message={depoMessage} /> : null}
            <TextInput
              value={depoContent}
              onChangeText={setDepoContent}
              multiline
              maxLength={500}
              placeholder="Escreva um depo com carinho..."
              placeholderTextColor={colors.textSoft}
              textAlignVertical="top"
              style={styles.textarea}
            />
            <View style={styles.rowBetween}>
              <Text style={styles.counter}>{500 - depoContent.length} restantes</Text>
              <Pressable
                onPress={handleDepoSend}
                disabled={depoMutation.isPending}
                style={[styles.primaryAction, depoMutation.isPending ? styles.actionDisabled : null]}
              >
                {depoMutation.isPending ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryActionText}>Enviar depo</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Ionicons name="time-outline" size={16} color={colors.primaryStrong} />
            <Text style={styles.timelineTitle}>SUA LINHA DO TEMPO</Text>
          </View>
          {events.length === 0 ? (
            <Text style={styles.emptyText}>Ainda não há eventos visíveis neste perfil.</Text>
          ) : (
            <ScrollView
              style={styles.timelineScroll}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {events.map((event, index) => {
                const meta = getTimelineMeta(event.type);
                const isLast = index === events.length - 1;
                return (
                  <View key={event.id} style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineIconWrap, { borderColor: meta.color + '55', backgroundColor: meta.color + '1a' }]}>
                        <Ionicons name={meta.icon as ComponentProps<typeof Ionicons>['name']} size={15} color={meta.color} />
                      </View>
                      {!isLast && <View style={[styles.timelineConnector, { backgroundColor: meta.color + '33' }]} />}
                    </View>
                    <View style={styles.timelineBody}>
                      <Text style={styles.timelineText}>{event.text}</Text>
                      <Text style={[styles.timelineDate, { color: meta.color + 'bb' }]}>{formatTimelineDate(event.date)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {(afilhadosQuery.data?.afilhados.length ?? 0) > 0 ? (
          <View style={styles.afilhadosCard}>
            <Text style={styles.afilhadosTitle}>
              {profile.isOwnProfile ? 'seus afilhados' : `afilhados de @${username}`}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.afilhadosRail}>
              {(afilhadosQuery.data?.afilhados ?? []).map((a) => (
                <Pressable key={a.id} style={styles.afilhadoItem} onPress={() => router.push(`/usuario/${a.username}`)}>
                  <ProfileAvatar username={a.username} imageUrl={a.profileImageUrl} size={48} />
                  <Text style={styles.afilhadoName} numberOfLines={1}>@{a.username}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

      </ScrollView>

      {profile.isOwnProfile ? (
        <ProfileStatusSheet
          visible={statusSheetOpen}
          onClose={() => setStatusSheetOpen(false)}
          username={username}
          initialStatusText={profile.user.statusText}
          initialPresence={profile.presenceStatus}
        />
      ) : null}
      {profile.isOwnProfile && showBadgePicker ? (
        <BadgeShowcasePicker username={username} onClose={() => setShowBadgePicker(false)} />
      ) : null}
      {/* Modal pequeno com detalhes da badge */}
      {selectedBadge ? (
        <Pressable style={styles.badgeModalOverlay} onPress={() => setSelectedBadge(null)}>
          <Pressable style={styles.badgeModalCard} onPress={() => {}}>
            {getMediaUri(selectedBadge.icon_url) ? (
              <Image source={{ uri: getMediaUri(selectedBadge.icon_url) ?? '' }} style={styles.badgeModalIcon} contentFit="contain" />
            ) : (
              <View style={[styles.badgeModalIcon, styles.badgeFallback]}>
                <Ionicons name="ribbon-outline" size={48} color={colors.primaryStrong} />
              </View>
            )}
            <Text style={styles.badgeModalTitle}>{selectedBadge.name}</Text>
            {selectedBadge.rarity ? <Text style={styles.badgeModalRarity}>{selectedBadge.rarity.toLowerCase()}</Text> : null}
          </Pressable>
        </Pressable>
      ) : null}
    </>
  );
}

function PrimaryBadge({ badge }: { badge: PrimaryBadgeInfo }) {
  return (
    <LinearGradient
      colors={badge.borderGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.primaryBadgeBorder}
    >
      <View style={styles.primaryBadge}>
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryBadgeSheen}
        />
        <View style={[styles.primaryBadgeIcon, { borderColor: badge.borderColor }]}>
          <Ionicons name="star" size={14} color={badge.color} />
        </View>
        <MaskedView
          style={styles.primaryBadgeTextMask}
          maskElement={<Text style={styles.primaryBadgeTextMaskLabel} numberOfLines={1}>{badge.label}</Text>}
        >
          <LinearGradient
            colors={badge.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBadgeTextGradient}
          />
        </MaskedView>
      </View>
    </LinearGradient>
  );
}

function SocialStat({
  label,
  value,
  icon,
  withDivider = false,
  onPress,
}: {
  label: string;
  value: number;
  icon: IoniconName;
  withDivider?: boolean;
  onPress?: () => void;
}) {
  const body = (
    <>
      <Ionicons name={icon} size={21} color={colors.primaryStrong} />
      <Text style={styles.socialValue}>{formatCompactNumber(value)}</Text>
      <Text style={styles.socialLabel} numberOfLines={2}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.socialItem,
          withDivider ? styles.socialDivider : null,
          pressed ? { opacity: 0.72 } : null,
        ]}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={[styles.socialItem, withDivider ? styles.socialDivider : null]}>{body}</View>;
}

function ReputationPanel({ info }: { info: ReputationProgressInfo }) {
  const borderGradient = getReputationBorderGradient(info.color);
  const fillGradient = getReputationGradient(info.color);

  return (
    <LinearGradient
      colors={borderGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.reputationPanelBorder}
    >
      <View style={styles.reputationPanel}>
        <View style={styles.reputationHeader}>
          <View>
            <Text style={styles.reputationLabel}>reputação</Text>
            <Text style={styles.reputationScore}>{formatCompactNumber(info.score)}</Text>
          </View>
          <View style={[styles.reputationTierPill, { borderColor: info.color }]}>
            <Text style={[styles.reputationTier, { color: info.color }]}>{info.currentLabel}</Text>
          </View>
        </View>

        <View style={styles.reputationProgressBlock}>
          <View style={styles.reputationNextRow}>
            <Text style={styles.reputationNextLabel}>Próximo nível</Text>
            <Text style={styles.reputationNextValue}>{info.nextLabel}</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={fillGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${info.percent}%` as any }]}
            />
          </View>
          <View style={styles.reputationNumbersRow}>
            <Text style={styles.reputationHelp}>faltam {formatCompactNumber(info.remaining)}</Text>
            <Text style={styles.reputationProgressText}>
              {formatCompactNumber(info.score)} / {formatCompactNumber(info.target)}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

function getTimelineMeta(type: string): { icon: string; color: string } {
  switch (type) {
    case 'joined':            return { icon: 'enter-outline',              color: '#8f46ff' };
    case 'first_depo':        return { icon: 'heart-outline',              color: '#fd65a0' };
    case 'depo_received':     return { icon: 'chatbubble-ellipses-outline',color: '#31d5de' };
    case 'badge_earned':      return { icon: 'ribbon-outline',             color: '#f59e0b' };
    case 'community_created': return { icon: 'planet-outline',             color: '#4ade80' };
    case 'friend_added':      return { icon: 'people-circle-outline',      color: '#60a5fa' };
    default:                  return { icon: 'radio-button-on-outline',    color: '#94a3b8' };
  }
}

function getPrimaryBadge(score: number | null): PrimaryBadgeInfo {
  const reputationMeta = getReputationMeta(score ?? 0);
  const gradient = getReputationGradient(reputationMeta.color);
  return {
    label: reputationMeta.label,
    color: reputationMeta.color,
    borderColor: reputationMeta.borderColor,
    gradient,
    borderGradient: getReputationBorderGradient(reputationMeta.color),
  };
}

function getReputationGradient(color: string): [string, string, string] {
  switch (color) {
    case '#fd65a0': return ['#ffd0e2', '#fd65a0', '#b22a67'];
    case '#f59e0b': return ['#ffe0a3', '#f59e0b', '#9a4d05'];
    case '#ff8c00': return ['#ffd29a', '#ff8c00', '#a93605'];
    case '#31d5de': return ['#b6fbff', '#31d5de', '#137a88'];
    case '#94a3b8': return ['#e2e8f0', '#94a3b8', '#475569'];
    default:        return ['#f4f3ff', color, '#6d28d9'];
  }
}

function getReputationBorderGradient(color: string): [string, string, string] {
  switch (color) {
    case '#fd65a0': return ['rgba(253, 101, 160, 0.16)', '#fd65a0', 'rgba(253, 101, 160, 0.28)'];
    case '#f59e0b': return ['rgba(245, 158, 11, 0.16)', '#f59e0b', 'rgba(245, 158, 11, 0.28)'];
    case '#ff8c00': return ['rgba(255, 140, 0, 0.16)', '#ff8c00', 'rgba(255, 140, 0, 0.28)'];
    case '#31d5de': return ['rgba(49, 213, 222, 0.16)', '#31d5de', 'rgba(49, 213, 222, 0.28)'];
    case '#94a3b8': return ['rgba(148, 163, 184, 0.16)', '#94a3b8', 'rgba(148, 163, 184, 0.28)'];
    default:        return ['rgba(168, 85, 247, 0.16)', color, 'rgba(168, 85, 247, 0.28)'];
  }
}

function getReputationProgress(score: number): ReputationProgressInfo {
  const current = getReputationMeta(score);

  let nextLabel: string;
  let rangeStart: number;
  let rangeEnd: number;

  if (score >= 900) {
    nextLabel = 'Lenda do tecê'; // já no topo
    rangeStart = 900;
    rangeEnd = 1000;
  } else if (score >= 700) {
    nextLabel = 'Lenda do tecê';
    rangeStart = 700;
    rangeEnd = 900;
  } else if (score >= 500) {
    nextLabel = 'OG';
    rangeStart = 500;
    rangeEnd = 700;
  } else if (score >= 200) {
    nextLabel = 'Tecê Raiz';
    rangeStart = 200;
    rangeEnd = 500;
  } else {
    nextLabel = 'Genin';
    rangeStart = 100;
    rangeEnd = 200;
  }

  const percent = Math.min(100, Math.max(4, ((score - rangeStart) / (rangeEnd - rangeStart)) * 100));

  return {
    score,
    currentLabel: current.label,
    nextLabel,
    target: rangeEnd,
    remaining: Math.max(0, rangeEnd - score),
    percent,
    color: current.color,
  };
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
    gap: spacing.md,
  },
  profileHero: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.18)',
    backgroundColor: 'rgba(10, 12, 28, 0.76)',
    paddingBottom: spacing.md,
  },
  cover: {
    height: 218,
    position: 'relative',
    overflow: 'visible',
  },
  coverMedia: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#11142a',
  },
  coverImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceSoft,
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#11142a',
  },
  coverAction: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.42)',
    backgroundColor: 'rgba(8, 10, 24, 0.7)',
    paddingHorizontal: spacing.sm,
  },
  coverActionText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  identityBlock: {
    gap: spacing.sm,
    marginTop: 52,
    paddingHorizontal: spacing.md,
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  avatarRing: {
    position: 'absolute',
    left: spacing.md,
    bottom: -46,
    padding: 3,
    borderRadius: 999,
    borderWidth: 3,
    backgroundColor: colors.background,
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  avatarPressable: { position: 'relative' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityNameBlock: { flex: 1, gap: 8, minWidth: 0 },
  username: { color: colors.text, fontFamily: fonts.black, fontSize: 28, fontWeight: '900' },
  presencePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.24)',
    backgroundColor: 'rgba(143, 70, 255, 0.1)',
    paddingHorizontal: spacing.sm,
  },
  presenceDot: { width: 10, height: 10, borderRadius: radius.pill },
  presenceText: { fontFamily: fonts.extrabold, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  primaryBadgeBorder: {
    maxWidth: 152,
    minHeight: 38,
    borderRadius: radius.pill,
    padding: 1,
    shadowColor: colors.black,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  primaryBadge: {
    position: 'relative',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 12, 28, 0.94)',
  },
  primaryBadgeSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    opacity: 0.5,
  },
  primaryBadgeIcon: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(244, 243, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadgeTextMask: {
    flexShrink: 1,
    width: 94,
    height: 20,
  },
  primaryBadgeTextMaskLabel: {
    fontFamily: fonts.black,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  primaryBadgeTextGradient: {
    flex: 1,
  },
  statusText: {
    color: colors.text,
    fontFamily: fonts.extrabold,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLine: {
    color: colors.textSoft,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  inviteLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 204, 102, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  inviteText: {
    color: colors.warning,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  editStatusBanner: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.42)',
    backgroundColor: 'rgba(143, 70, 255, 0.14)',
  },
  editStatusBannerPressed: { opacity: 0.7 },
  editStatusText: {
    color: colors.primaryStrong,
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.18)',
    backgroundColor: 'rgba(10, 12, 28, 0.88)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  socialCard: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.24)',
    backgroundColor: 'rgba(10, 12, 28, 0.9)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    shadowColor: colors.primaryStrong,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  socialItem: {
    flex: 1,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 3,
  },
  socialDivider: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(143, 70, 255, 0.13)',
  },
  socialValue: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 22,
    fontWeight: '900',
  },
  socialLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  reputationPanelBorder: {
    borderRadius: radius.lg,
    padding: 1,
    shadowColor: colors.black,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  reputationPanel: {
    position: 'relative',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(10, 12, 28, 0.94)',
    padding: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
  },
  reputationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reputationLabel: {
    color: colors.textMuted,
    fontFamily: fonts.extrabold,
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  reputationScore: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 47,
    fontWeight: '900',
  },
  reputationTierPill: {
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(244, 243, 255, 0.06)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  reputationTier: {
    fontFamily: fonts.black,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reputationProgressBlock: {
    gap: 8,
  },
  reputationNextRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  reputationNextLabel: {
    color: colors.textSoft,
    fontFamily: fonts.bold,
    fontSize: 12,
    fontWeight: '700',
  },
  reputationNextValue: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  progressTrack: {
    height: 23,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: 'rgba(244, 243, 255, 0.1)',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  reputationNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reputationHelp: {
    color: colors.textSoft,
    fontFamily: fonts.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  reputationProgressText: {
    color: colors.textMuted,
    fontFamily: fonts.extrabold,
    fontSize: 12,
    fontWeight: '800',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  badgeRail: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingRight: spacing.xs,
  },
  badgeChip: {
    width: 104,
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: 'rgba(143, 70, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.28)',
  },
  badgeFallback: { alignItems: 'center', justifyContent: 'center' },
  badgeLabel: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
  },
  addShowcaseBadge: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.42)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(143, 70, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  badgeModalCard: {
    width: 240,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.26)',
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeModalIcon: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: 'rgba(143, 70, 255, 0.12)',
  },
  badgeModalTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  badgeModalRarity: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13, textTransform: 'uppercase' },
  afilhadosCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  afilhadosTitle: {
    color: colors.text,
    fontFamily: fonts.extrabold,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  afilhadosRail: { gap: spacing.md, paddingVertical: spacing.xs },
  afilhadoItem: { alignItems: 'center', gap: 6, width: 64 },
  afilhadoName: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: 11, textAlign: 'center' },
  deposPendingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.2)',
  },
  deposPendingText: { flex: 1, color: '#f59e0b', fontFamily: fonts.semibold, fontSize: 12, fontWeight: '600' },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.extrabold,
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeSectionTitle: {
    fontSize: 11,
  },
  sectionSubtitle: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  textarea: {
    minHeight: 110,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  counter: { color: colors.textSoft, fontFamily: fonts.semibold, fontSize: 13, fontWeight: '600' },
  primaryAction: {
    minHeight: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionDisabled: { opacity: 0.7 },
  primaryActionText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, fontWeight: '700' },
  linkText: { color: colors.primaryStrong, fontFamily: fonts.bold, fontSize: 13, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  friendStrip: { gap: spacing.sm, paddingVertical: spacing.xs },
  friendChip: { width: 72, alignItems: 'center', gap: 6 },
  friendName: { color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center', maxWidth: 72 },
  timelineCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(143, 70, 255, 0.22)',
    backgroundColor: 'rgba(8, 6, 24, 0.92)',
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(143, 70, 255, 0.14)',
  },
  timelineTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  timelineScroll: { maxHeight: 300 },
  timelineItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timelineLeft: { alignItems: 'center', width: 32 },
  timelineIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineConnector: { width: 1, flex: 1, minHeight: 12, marginVertical: 3 },
  timelineBody: { flex: 1, gap: 3, paddingTop: 7, paddingBottom: spacing.sm },
  timelineText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  timelineDate: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  depoRail: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
    paddingRight: spacing.xs,
  },
  depoRailItem: {
    width: 212,
    minHeight: 178,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  depoItem: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(14, 18, 38, 0.92)',
    padding: spacing.md,
    gap: spacing.sm,
  },
  depoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  depoMeta: { gap: 2 },
  depoAuthor: { color: colors.text, fontFamily: fonts.bold, fontSize: 14, fontWeight: '700' },
  depoDate: { color: colors.textSoft, fontFamily: fonts.medium, fontSize: 12 },
  depoContent: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  stateTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  stateText: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
