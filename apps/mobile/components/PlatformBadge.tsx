import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Platform } from '@clipvault/shared';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@clipvault/shared';
import { borderRadius, typography } from '../theme/theme';

interface PlatformBadgeProps {
  platform: Platform;
  size?: 'sm' | 'md';
}

// Platform abbreviations for small badges
const PLATFORM_SHORT: Record<Platform, string> = {
  YOUTUBE: 'YT',
  TIKTOK: 'TT',
  INSTAGRAM: 'IG',
  FACEBOOK: 'FB',
  PINTEREST: 'PIN',
  X_TWITTER: 'X',
  VIMEO: 'VI',
  REDDIT: 'RD',
  OTHER: '•',
};

export default function PlatformBadge({ platform, size = 'sm' }: PlatformBadgeProps) {
  const backgroundColor = PLATFORM_COLORS[platform] || '#636E72';
  const label = size === 'sm' ? PLATFORM_SHORT[platform] : PLATFORM_LABELS[platform];

  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, { backgroundColor }]}>
      <Text style={[styles.text, size === 'md' && styles.textMd]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    ...typography.small,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  textMd: {
    ...typography.caption,
    fontWeight: '600',
  },
});
