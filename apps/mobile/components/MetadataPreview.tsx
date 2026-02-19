import React from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import type { VideoMetadata } from '@clipvault/shared';
import { formatDuration } from '@clipvault/shared';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';
import { useThemeColors } from '../theme/theme';
import PlatformBadge from './PlatformBadge';

interface MetadataPreviewProps {
  metadata: VideoMetadata | null;
  isLoading?: boolean;
  url?: string;
}

export default function MetadataPreview({ metadata, isLoading, url }: MetadataPreviewProps) {
  const themeColors = useThemeColors();

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
        <ActivityIndicator color={colors.primary} style={{ padding: spacing.lg }} />
        <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
          Fetching video info…
        </Text>
      </View>
    );
  }

  if (!metadata) return null;

  const duration = formatDuration(metadata.duration);

  return (
    <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
      <View style={styles.row}>
        {/* Thumbnail */}
        <View style={styles.thumbnailWrapper}>
          {metadata.thumbnailUrl ? (
            <Image source={{ uri: metadata.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderBg]} />
          )}
          {duration ? (
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{duration}</Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={3}>
            {metadata.title ?? 'Untitled Video'}
          </Text>
          <View style={styles.metaRow}>
            <PlatformBadge platform={metadata.platform} size="sm" />
            {metadata.authorName && (
              <Text style={[styles.author, { color: themeColors.textSecondary }]} numberOfLines={1}>
                {metadata.authorName}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* URL preview */}
      {url && (
        <Text style={[styles.url, { color: themeColors.textSecondary }]} numberOfLines={1}>
          {url}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 100,
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderBg: {
    backgroundColor: '#DFE6E9',
  },
  durationPill: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.caption,
    fontWeight: '500',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  author: {
    ...typography.small,
  },
  url: {
    ...typography.small,
    fontStyle: 'italic',
  },
  loadingText: {
    ...typography.caption,
    textAlign: 'center',
    paddingBottom: spacing.md,
  },
});
