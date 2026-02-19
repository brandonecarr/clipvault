import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Video } from '@clipvault/shared';
import { formatDuration, formatRelativeDate } from '@clipvault/shared';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';
import { useThemeColors } from '../theme/theme';
import PlatformBadge from './PlatformBadge';

interface VideoCardProps {
  video: Video;
  viewMode?: 'grid' | 'list';
  onPress: () => void;
  onLongPress?: () => void;
}

export default function VideoCard({
  video,
  viewMode = 'grid',
  onPress,
  onLongPress,
}: VideoCardProps) {
  const themeColors = useThemeColors();
  const duration = formatDuration(video.duration);
  const date = formatRelativeDate(video.createdAt);

  if (viewMode === 'list') {
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: themeColors.surface }, shadows.sm]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.75}
      >
        <View style={styles.listThumbnailWrapper}>
          {video.thumbnailUrl ? (
            <Image source={{ uri: video.thumbnailUrl }} style={styles.listThumbnail} />
          ) : (
            <View style={[styles.listThumbnail, styles.placeholderBg]}>
              <Ionicons name="play-circle-outline" size={28} color={themeColors.textSecondary} />
            </View>
          )}
          {duration ? (
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{duration}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.listInfo}>
          <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>
            {video.title ?? 'Untitled Video'}
          </Text>
          <View style={styles.listMeta}>
            <PlatformBadge platform={video.platform} />
            <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>{date}</Text>
          </View>
          {video.authorName && (
            <Text style={[styles.author, { color: themeColors.textSecondary }]} numberOfLines={1}>
              {video.authorName}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Grid view
  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: themeColors.surface }, shadows.sm]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={styles.thumbnailWrapper}>
        {video.thumbnailUrl ? (
          <Image source={{ uri: video.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholderBg]}>
            <Ionicons name="play-circle-outline" size={36} color={themeColors.textSecondary} />
          </View>
        )}
        {/* Platform badge overlay */}
        <View style={styles.badgeOverlay}>
          <PlatformBadge platform={video.platform} />
        </View>
        {/* Duration pill */}
        {duration ? (
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.gridInfo}>
        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={2}>
          {video.title ?? 'Untitled Video'}
        </Text>
        <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>{date}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid card
  gridCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    flex: 1,
  },
  thumbnailWrapper: {
    aspectRatio: 16 / 9,
    backgroundColor: '#E5E5E5',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderBg: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DFE6E9',
  },
  badgeOverlay: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  durationPill: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  gridInfo: {
    padding: spacing.sm,
    gap: 2,
  },

  // List card
  listCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    gap: spacing.sm,
    padding: spacing.sm,
    alignItems: 'flex-start',
  },
  listThumbnailWrapper: {
    position: 'relative',
    width: 120,
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    flexShrink: 0,
  },
  listThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listInfo: {
    flex: 1,
    gap: 4,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },

  // Shared
  title: {
    ...typography.caption,
    fontWeight: '500',
    lineHeight: 18,
  },
  metaText: {
    ...typography.small,
  },
  author: {
    ...typography.small,
  },
});
