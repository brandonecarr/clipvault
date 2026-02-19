import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Folder } from '@clipvault/shared';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/theme';
import { useThemeColors } from '../theme/theme';

interface FolderCardProps {
  folder: Folder & { videoCount?: number; subfolderCount?: number };
  onPress: () => void;
  onLongPress?: () => void;
}

export default function FolderCard({ folder, onPress, onLongPress }: FolderCardProps) {
  const themeColors = useThemeColors();
  const folderColor = folder.color ?? colors.primary;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      {/* Color accent bar */}
      <View style={[styles.colorBar, { backgroundColor: folderColor }]} />

      <View style={styles.content}>
        {/* Header row: icon + name */}
        <View style={styles.header}>
          <View style={[styles.iconWrapper, { backgroundColor: `${folderColor}20` }]}>
            <Text style={styles.icon}>{folder.icon ?? '📁'}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={themeColors.textSecondary}
            style={styles.chevron}
          />
        </View>

        {/* Folder name */}
        <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={2}>
          {folder.name}
        </Text>

        {/* Stats row */}
        <View style={styles.stats}>
          {(folder.videoCount ?? 0) > 0 && (
            <View style={styles.stat}>
              <Ionicons name="play-circle-outline" size={12} color={themeColors.textSecondary} />
              <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
                {folder.videoCount}
              </Text>
            </View>
          )}
          {(folder.subfolderCount ?? 0) > 0 && (
            <View style={styles.stat}>
              <Ionicons name="folder-outline" size={12} color={themeColors.textSecondary} />
              <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
                {folder.subfolderCount}
              </Text>
            </View>
          )}
          {(folder.videoCount ?? 0) === 0 && (folder.subfolderCount ?? 0) === 0 && (
            <Text style={[styles.statText, { color: themeColors.textSecondary }]}>Empty</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    flex: 1,
    minWidth: 140,
  },
  colorBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  chevron: {
    marginTop: 2,
  },
  name: {
    ...typography.bodyMedium,
    fontWeight: '600',
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    ...typography.caption,
  },
});
