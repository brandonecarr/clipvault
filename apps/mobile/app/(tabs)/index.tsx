import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFolders, useCreateFolder, useDeleteFolder, getRootFolders } from '../../hooks/useFolders';
import FolderCard from '../../components/FolderCard';
import EmptyState from '../../components/EmptyState';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme/theme';
import { useThemeColors } from '../../theme/theme';
import { FOLDER_COLOR_PRESETS } from '@clipvault/shared';
import type { Folder } from '@clipvault/shared';

export default function HomeScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();

  const { data: folders, isLoading, refetch, isRefetching } = useFolders();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLOR_PRESETS[0]);

  const rootFolders = folders ? getRootFolders(folders) : [];

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;

    try {
      await createFolder.mutateAsync({
        name: newFolderName.trim(),
        icon: newFolderIcon,
        color: selectedColor,
      });
      setShowCreateModal(false);
      setNewFolderName('');
      setNewFolderIcon('📁');
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleLongPress = (folder: Folder) => {
    Alert.alert(folder.name, 'What would you like to do?', [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Delete Folder',
            `Delete "${folder.name}" and all its contents? This cannot be undone.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteFolder.mutate(folder.id),
              },
            ],
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.appTitle, { color: colors.primary }]}>ClipVault</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            {rootFolders.length} folder{rootFolders.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Folder grid */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rootFolders}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <FolderCard
              folder={item}
              onPress={() => router.push(`/folder/${item.id}`)}
              onLongPress={() => handleLongPress(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="folder-open-outline"
              title="No folders yet"
              subtitle="Create your first folder to start organizing your saved videos."
              actionLabel="Create Folder"
              onAction={() => setShowCreateModal(true)}
            />
          }
        />
      )}

      {/* Create Folder Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>New Folder</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Icon picker */}
            <View style={styles.iconSection}>
              <TextInput
                style={[styles.iconInput, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
                value={newFolderIcon}
                onChangeText={setNewFolderIcon}
                maxLength={2}
                textAlign="center"
              />
              <Text style={[styles.iconHint, { color: themeColors.textSecondary }]}>
                Tap to change emoji icon
              </Text>
            </View>

            {/* Name input */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>
                Folder Name
              </Text>
              <TextInput
                style={[styles.nameInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="e.g. Build A House"
                placeholderTextColor={themeColors.textSecondary}
                autoFocus
              />
            </View>

            {/* Color picker */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Color</Text>
              <View style={styles.colorRow}>
                {FOLDER_COLOR_PRESETS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorSwatchSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.createButton, !newFolderName.trim() && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={!newFolderName.trim() || createFolder.isPending}
              activeOpacity={0.85}
            >
              {createFolder.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Create Folder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  appTitle: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.caption,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
    flexGrow: 1,
  },
  row: {
    gap: spacing.md,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
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
  modalTitle: {
    ...typography.h2,
  },
  modalContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  iconSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconInput: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    fontSize: 36,
    textAlign: 'center',
  },
  iconHint: {
    ...typography.caption,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '500',
  },
  nameInput: {
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
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
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.sm,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
