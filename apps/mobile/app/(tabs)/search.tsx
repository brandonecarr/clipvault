import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchVideos } from '../../hooks/useVideos';
import VideoCard from '../../components/VideoCard';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, borderRadius, typography } from '../../theme/theme';
import { useThemeColors } from '../../theme/theme';
import type { Folder, Video } from '@clipvault/shared';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

type SearchResultItem =
  | { type: 'folder'; data: Folder }
  | { type: 'video'; data: Video };

export default function SearchScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useSearchVideos(debouncedQuery);

  const hasResults =
    results && (results.folders.length > 0 || results.videos.length > 0);

  const sections = [];
  if (results?.folders?.length) {
    sections.push({
      title: 'Folders',
      data: results.folders.map((f) => ({ type: 'folder' as const, data: f })),
    });
  }
  if (results?.videos?.length) {
    sections.push({
      title: 'Videos',
      data: results.videos.map((v) => ({ type: 'video' as const, data: v })),
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.text }]}>Search</Text>
      </View>

      {/* Search input */}
      <View style={[styles.searchBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
        <Ionicons name="search-outline" size={18} color={themeColors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search videos, folders, tags…"
          placeholderTextColor={themeColors.textSecondary}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
        {isLoading && debouncedQuery.length > 0 && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* Results */}
      {!debouncedQuery ? (
        <EmptyState
          icon="search-outline"
          title="Search your library"
          subtitle="Find videos by title, notes, tags, or folder name."
        />
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !hasResults ? (
        <EmptyState
          icon="search-outline"
          title={`No results for "${debouncedQuery}"`}
          subtitle="Try different keywords or check the spelling."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            if (item.type === 'folder') {
              return (
                <TouchableOpacity
                  style={[styles.folderResult, { backgroundColor: themeColors.surface }]}
                  onPress={() => router.push(`/folder/${item.data.id}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.folderIcon}>{item.data.icon ?? '📁'}</Text>
                  <View style={styles.folderResultInfo}>
                    <Text style={[styles.folderResultName, { color: themeColors.text }]}>
                      {item.data.name}
                    </Text>
                    {item.data.description && (
                      <Text
                        style={[styles.folderResultDesc, { color: themeColors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.data.description}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={themeColors.textSecondary} />
                </TouchableOpacity>
              );
            }
            return (
              <VideoCard
                video={item.data}
                viewMode="list"
                onPress={() => router.push(`/video/${item.data.id}`)}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  folderResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  folderIcon: {
    fontSize: 22,
  },
  folderResultInfo: {
    flex: 1,
  },
  folderResultName: {
    ...typography.bodyMedium,
  },
  folderResultDesc: {
    ...typography.caption,
  },
});
