import { API_BASE_URL } from '../../lib/config';
import { colors } from '../ui/theme';
import type { PresenceStatus } from './types';

export function getMediaUri(url: string | null) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
}

// Cores alinhadas com o site (src/components/profile/ProfileHeader.tsx).
export function getPresenceMeta(status: PresenceStatus) {
  switch (status) {
    case 'online':
      return { label: 'online', color: '#22c55e' };
    case 'busy':
      return { label: 'ocupado', color: '#f87171' };
    case 'away':
      return { label: 'ausente', color: '#fbbf24' };
    default:
      return { label: 'offline', color: colors.border };
  }
}

export function formatProfileDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTimelineDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

export function formatActivityDate(date: string) {
  const d = new Date(date);
  const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} às ${timePart}`;
}

export function getInitials(username: string) {
  return username.slice(0, 1).toUpperCase();
}

// Espelho de src/lib/reputation.ts → getReputationTier (mesmo cálculo do backend).
// Capitalização ajustada pra exibição no mobile.
export function getReputationMeta(score: number): {
  label: string;
  color: string;
  borderColor: string;
  background: string;
} {
  if (score >= 900) {
    return {
      label: 'Lenda do tecê',
      color: '#ff8c00',
      borderColor: 'rgba(255, 100, 0, 0.6)',
      background: 'rgba(220, 50, 0, 0.13)',
    };
  }
  if (score >= 700) {
    return {
      label: 'OG',
      color: '#f59e0b',
      borderColor: 'rgba(245, 158, 11, 0.5)',
      background: 'rgba(245, 158, 11, 0.12)',
    };
  }
  if (score >= 500) {
    return {
      label: 'Tecê Raiz',
      color: '#fd65a0',
      borderColor: 'rgba(253, 101, 160, 0.5)',
      background: 'rgba(253, 101, 160, 0.12)',
    };
  }
  if (score >= 200) {
    return {
      label: 'Genin',
      color: '#31d5de',
      borderColor: 'rgba(49, 213, 222, 0.5)',
      background: 'rgba(49, 213, 222, 0.12)',
    };
  }
  return {
    label: 'NPC',
    color: '#94a3b8',
    borderColor: 'rgba(148, 163, 184, 0.5)',
    background: 'rgba(148, 163, 184, 0.12)',
  };
}

export function getReputationTier(score: number): string {
  return getReputationMeta(score).label;
}

export function getPresenceDot(status: PresenceStatus) {
  return getPresenceMeta(status).color;
}

export function hasBlockedLink(value: string) {
  return /https?:\/\/|www\.|[a-z0-9-]+\.(com|net|org|br|io|co|app|dev|info|biz)(\/|\s|$)/i.test(value);
}
