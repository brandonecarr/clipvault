import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFolder, useCreateFolder, useDeleteFolder } from '../../hooks/useFolders';
import { useFolderVideos, useSaveVideo, useDeleteVideo, useExtractMetadata } from '../../hooks/useVideos';
import { useUIStore } from '../../stores/uiStore';
import FolderCard from '../../components/FolderCard';
import VideoCard from '../../components/VideoCard';
import BreadcrumbBar from '../../components/BreadcrumbBar';
import EmptyState from '../../components/EmptyState';
import MetadataPreview from '../../components/MetadataPreview';
import FolderPicker from '../../components/FolderPicker';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme/theme';
import { useThemeColors } from '../../theme/theme';
import { FOLDER_COLOR_PRESETS } from '@clipvault/shared';
import type { Video } from '@clipvault/shared';

export default function FolderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const themeColors = useThemeColors();
  const { viewMode } = useUIStore();

  const { data: folder, isLoading: folderLoading, refetch } = useFolder(id);
  const videosQuery = useFolderVideos(id);
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const saveVideo = useSaveVideo();
  const deleteVideo = useDeleteVideo();
  const extractMetadata = useExtractMetadata();

  // Modals
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);

  // Create folder form
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLOR_PRESETS[0]);

  // Add video form
  const [videoUrl, setVideoUrl] = useState('');
  const [videoNotes, setVideoNotes] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState(id);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const allVideos =
    videosQuery.data?.pages?.flatMap((p) => p.videos) ?? [];

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder.mutateAsync({
        name: newFolderName.trim(),
        icon: newFolderIcon,
        color: selectedColor,
        parentId: id,
      });
      setShowCreateFolder(false);
      setNewFolderName('');
      setNewFolderIcon('📁');
      refetch();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleExtractAndSave = async () => {
    if (!videoUrl.trim()) return;

    try {
      const metadata = await extractMetadata.mutateAsync(videoUrl.trim());

      await saveVideo.mutateAsync({
        url: videoUrl.trim(),
        folderId: selectedFolderId,
        notes: videoNotes.trim() || null,
      });

      setShowAddVideo(false);
      setVideoUrl('');
      setVideoNotes('');
      setSelectedFolderId(id);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleVideoLongPress = (video: Video) => {
    Alert.alert(video.title ?? 'Video', 'What would you like to do?', [
      {
        text: 'Open',
        onPress: () => router.push(`/video/${video.id}`),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Video', 'Remove this video from your library?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteVideo.mutate({ id: video.id, folderId: video.folderId }),
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (folderLoading) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!folder) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <Text style={{ color: themeColors.text }}>Folder not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: themeColors.background }]}
      edges={['bottom']}
    >
      {/* Breadcrumbs */}
      <BreadcrumbBar crumbs={folder.path ?? []} />

      {/* Folder title */}
      <View style={styles.folderHeader}>
        <View style={[styles.folderIconWrapper, { backgroundColor: `${folder.color ?? colors.primary}20` }]}>
          <Text style={styles.folderIcon}>{folder.icon ?? '📁'}</Text>
        </View>
        <Text style={[styles.folderName, { color: themeColors.text }]}>{folder.name}</Text>
      </View>

      <FlatList
        data={allVideos}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render on viewMode change
        columnWrapperStyle={viewMode === 'grid' ? styles.videoRow : undefined}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (videosQuery.hasNextPage) videosQuery.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={videosQuery.isRefetching}
            onRefresh={() => videosQuery.refetch()}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          folder.children.length > 0 ? (
            <View style={styles.subfoldersSection}>
              <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>
                Folders
              </Text>
              <View style={styles.subfolderGrid}>
                {folder.children.map((child) => (
                  <View key={child.id} style={styles.subfolderCard}>
                    <FolderCard
                      folder={child}
                      onPress={() => router.push(`/folder/${child.id}`)}
                      onLongPress={() =>
                        Alert.alert(child.name, '', [
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => deleteFolder.mutate(child.id),
                          },
                          { text: 'Cancel', style: 'cancel' },
                        ])
                      }
                    />
                  </View>
                ))}
              </View>
              {allVideos.length > 0 && (
                <Text style={[styles.sectionLabel, { color: themeColors.textSecondary, marginTop: spacing.md }]}>
                  Videos
                </Text>
              )}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={viewMode === 'grid' ? styles.gridItem : styles.listItem}>
            <VideoCard
              video={item}
              viewMode={viewMode}
              onPress={() => router.push(`/video/${item.id}`)}
              onLongPress={() => handleVideoLongPress(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          folder.children.length === 0 ? (
            <EmptyState
              icon="play-circle-outline"
              title="This folder is empty"
              subtitle="Add a video or create a subfolder to get started."
              actionLabel="Add Video"
              onAction={() => setShowAddVideo(true)}
            />
          ) : null
        }
      />

      {/* Action buttons */}
      <View style={[styles.actionBar, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowCreateFolder(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="folder-outline" size={20} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.primary }]}>New Folder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addVideoButton]}
          onPress={() => setShowAddVideo(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addVideoLabel}>Add Video</Text>
        </TouchableOpacity>
      </View>

      {/* Create Subfolder Modal */}
      <Modal visible={showCreateFolder} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>New Subfolder</Text>
            <TouchableOpacity onPress={() => setShowCreateFolder(false)}>
              <Ionicons name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <TextInput
              style={[styles.textInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Folder name"
              placeholderTextColor={themeColors.textSecondary}
              autoFocus
            />

            <View style={styles.colorRow}>
              {FOLDER_COLOR_PRESETS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorSelected,
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, !newFolderName.trim() && styles.buttonDisabled]}
              onPress={handleCreateFolder}
              disabled={!newFolderName.trim() || createFolder.isPending}
            >
              {createFolder.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Video Modal */}
      <Modal visible={showAddVideo} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add Video</Text>
            <TouchableOpacity onPress={() => setShowAddVideo(false)}>
              <Ionicons name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {/* URL input */}
            <View style={styles.urlRow}>
              <TextInput
                style={[styles.textInput, styles.urlInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="Paste video URL…"
                placeholderTextColor={themeColors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => extractMetadata.mutate(videoUrl.trim())}
                disabled={!videoUrl.trim() || extractMetadata.isPending}
              >
                {extractMetadata.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* Metadata preview */}
            <MetadataPreview
              metadata={extractMetadata.data ?? null}
              isLoading={extractMetadata.isPending}
              url={videoUrl}
            />

            {/* Notes */}
            <TextInput
              style={[styles.textInput, styles.notesInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
              value={videoNotes}
              onChangeText={setVideoNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={themeColors.textSecondary}
              multiline
              numberOfLines={3}
            />

            {/* Folder picker */}
            <TouchableOpacity
              style={[styles.folderPickerButton, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}
              onPress={() => setShowFolderPicker(true)}
            >
              <Ionicons name="folder-outline" size={18} color={colors.primary} />
              <Text style={[styles.folderPickerText, { color: themeColors.text }]}>
                {folder.name}
              </Text>
              <Ionicons name="chevron-down" size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {/* Save button */}
            <TouchableOpacity
              style={[styles.primaryButton, !videoUrl.trim() && styles.buttonDisabled]}
              onPress={handleExtractAndSave}
              disabled={!videoUrl.trim() || saveVideo.isPending}
            >
              {saveVideo.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Save Video</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Folder picker sub-modal */}
      <Modal visible={showFolderPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modal, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Choose Folder</Text>
            <TouchableOpacity onPress={() => setShowFolderPicker(false)}>
              <Ionicons name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <FolderPicker
            selectedFolderId={selectedFolderId}
            onSelect={(folderId) => {
              setSelectedFolderId(folderId);
              setShowFolderPicker(false);
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  folderIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIcon: { fontSize: 22 },
  folderName: { ...typography.h2, flex: 1 },

  // List
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
    paddingBottom: 80,
  },
  subfoldersSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  subfolderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  subfolderCard: {
    width: '48%',
  },
  videoRow: {
    gap: spacing.sm,
  },
  gridItem: {
    flex: 1,
  },
  listItem: {
    marginBottom: spacing.xs,
  },

  // Action bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  addVideoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  addVideoLabel: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Modal
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE6E9',
  },
  modalTitle: { ...typography.h2 },
  modalBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
  },
  urlRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  urlInput: { flex: 1 },
  previewButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  folderPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  folderPickerText: {
    ...typography.body,
    flex: 1,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
