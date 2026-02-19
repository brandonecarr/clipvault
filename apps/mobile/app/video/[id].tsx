import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useQuery } from '@tanstack/react-query';
import { useDeleteVideo } from '../../hooks/useVideos';
import PlatformBadge from '../../components/PlatformBadge';
import TagChip from '../../components/TagChip';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme/theme';
import { useThemeColors } from '../../theme/theme';
import { formatDuration, formatRelativeDate } from '@clipvault/shared';
import api, { apiRequest } from '../../services/api';
import type { Video } from '@clipvault/shared';

// Deep link map for native apps
const DEEP_LINKS: Partial<Record<string, (url: string) => string>> = {
  YOUTUBE: (url) => url.replace('https://www.youtube.com', 'youtube://').replace('https://youtu.be', 'youtube://'),
  TIKTOK: (url) => url, // Universal links work
  INSTAGRAM: (url) => url, // Universal links work
};

async function openVideo(url: string, platform: string) {
  const deepLinkFn = DEEP_LINKS[platform];

  if (deepLinkFn) {
    const deepUrl = deepLinkFn(url);
    const canOpen = await Linking.canOpenURL(deepUrl);
    if (canOpen) {
      await Linking.openURL(deepUrl);
      return;
    }
  }

  // Fall back to in-app browser
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
  });
}

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const themeColors = useThemeColors();
  const deleteVideo = useDeleteVideo();

  // Fetch video details
  const { data, isLoading } = useQuery({
    queryKey: ['video', id],
    queryFn: async () => {
      // We don't have a dedicated GET /videos/:id endpoint, so we'll use the folder's list
      // For now, return from React Query cache or make a search call
      const result = await apiRequest<{ videos: Video[] }>(
        api.get('/videos/search', { params: { q: id } }),
      );
      // Fallback — in a full impl we'd add GET /videos/:id
      return null as Video | null;
    },
    enabled: !!id,
  });

  const handleDelete = () => {
    if (!data) return;
    Alert.alert('Delete Video', 'Remove this video from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteVideo.mutate({ id: data.id, folderId: data.folderId });
          router.back();
        },
      },
    ]);
  };

  if (!data) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
        <View style={styles.placeholder}>
          <Text style={{ color: themeColors.textSecondary }}>
            Video data will load here. Implement GET /api/v1/videos/:id endpoint.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const duration = formatDuration(data.duration);
  const date = formatRelativeDate(data.createdAt);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Thumbnail */}
        {data.thumbnailUrl && (
          <Image source={{ uri: data.thumbnailUrl }} style={styles.thumbnail} />
        )}

        {/* Info card */}
        <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
          {/* Platform + duration row */}
          <View style={styles.metaRow}>
            <PlatformBadge platform={data.platform} size="md" />
            {duration && (
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={13} color={themeColors.textSecondary} />
                <Text style={[styles.durationText, { color: themeColors.textSecondary }]}>
                  {duration}
                </Text>
              </View>
            )}
            <Text style={[styles.dateText, { color: themeColors.textSecondary }]}>{date}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: themeColors.text }]}>
            {data.title ?? 'Untitled Video'}
          </Text>

          {/* Author */}
          {data.authorName && (
            <Text style={[styles.author, { color: themeColors.textSecondary }]}>
              by {data.authorName}
            </Text>
          )}

          {/* Description */}
          {data.description && (
            <Text style={[styles.description, { color: themeColors.textSecondary }]} numberOfLines={4}>
              {data.description}
            </Text>
          )}
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
            <Text style={[styles.cardLabel, { color: themeColors.textSecondary }]}>Your Notes</Text>
            <Text style={[styles.notes, { color: themeColors.text }]}>{data.notes}</Text>
          </View>
        )}

        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
            <Text style={[styles.cardLabel, { color: themeColors.textSecondary }]}>Tags</Text>
            <View style={styles.tagsRow}>
              {data.tags.map((tag) => (
                <TagChip key={tag.id} name={tag.name} />
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => openVideo(data.url, data.platform)}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.openButtonText}>Watch Video</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { borderColor: themeColors.border }]}
            onPress={() => {
              /* Copy URL to clipboard */
            }}
          >
            <Ionicons name="copy-outline" size={20} color={themeColors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { borderColor: colors.error }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    ...typography.caption,
  },
  dateText: {
    ...typography.caption,
    marginLeft: 'auto',
  },
  title: {
    ...typography.h3,
    lineHeight: 26,
  },
  author: {
    ...typography.body,
  },
  description: {
    ...typography.body,
    lineHeight: 22,
  },
  cardLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  notes: {
    ...typography.body,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  openButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 4,
  },
  openButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
