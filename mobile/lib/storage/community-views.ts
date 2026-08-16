import * as SecureStore from 'expo-secure-store';

const KEY = 'community-views';

export type CommunityViews = Record<string, string>;

export async function getCommunityViews(): Promise<CommunityViews> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as CommunityViews;
    }
    return {};
  } catch {
    return {};
  }
}

export async function markCommunityViewed(communityId: string): Promise<void> {
  const current = await getCommunityViews();
  current[communityId] = new Date().toISOString();
  await SecureStore.setItemAsync(KEY, JSON.stringify(current));
}

export const communityViewsQueryKey = ['community-views'] as const;
