import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Folder } from '@clipvault/shared';
import { colors, spacing, borderRadius, typography } from '../theme/theme';
import { useThemeColors } from '../theme/theme';
import { useFolders, getRootFolders, getChildFolders } from '../hooks/useFolders';

interface FolderPickerProps {
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
}

interface FolderRowProps {
  folder: Folder & { videoCount?: number; subfolderCount?: number };
  allFolders: (Folder & { videoCount?: number; subfolderCount?: number })[];
  depth: number;
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
}

function FolderRow({ folder, allFolders, depth, selectedFolderId, onSelect }: FolderRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const themeColors = useThemeColors();
  const children = getChildFolders(allFolders, folder.id);
  const hasChildren = children.length > 0 || (folder.subfolderCount ?? 0) > 0;
  const isSelected = selectedFolderId === folder.id;
  const folderColor = folder.color ?? colors.primary;

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.row,
          { paddingLeft: spacing.md + depth * 20 },
          isSelected && styles.rowSelected,
        ]}
        onPress={() => onSelect(folder.id)}
        activeOpacity={0.7}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <TouchableOpacity
            onPress={() => setIsExpanded((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.expandButton}
          >
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={14}
              color={themeColors.textSecondary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.expandPlaceholder} />
        )}

        {/* Folder icon */}
        <Text style={styles.folderIcon}>{folder.icon ?? '📁'}</Text>

        {/* Folder name */}
        <Text
          style={[
            styles.folderName,
            { color: isSelected ? colors.primary : themeColors.text },
            isSelected && styles.folderNameSelected,
          ]}
          numberOfLines={1}
        >
          {folder.name}
        </Text>

        {/* Selected checkmark */}
        {isSelected && (
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.check} />
        )}
      </TouchableOpacity>

      {/* Children (expanded) */}
      {isExpanded && (
        <View>
          {children.map((child) => (
            <FolderRow
              key={child.id}
              folder={child}
              allFolders={allFolders}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function FolderPicker({ selectedFolderId, onSelect }: FolderPickerProps) {
  const themeColors = useThemeColors();
  const { data: folders, isLoading } = useFolders();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!folders || folders.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
          No folders yet. Create one first!
        </Text>
      </View>
    );
  }

  const rootFolders = getRootFolders(folders);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {rootFolders.map((folder) => (
        <FolderRow
          key={folder.id}
          folder={folder}
          allFolders={folders}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 300,
  },
  center: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingRight: spacing.md,
    gap: spacing.xs,
  },
  rowSelected: {
    backgroundColor: '#F0EDFF',
  },
  expandButton: {
    width: 20,
    alignItems: 'center',
  },
  expandPlaceholder: {
    width: 20,
  },
  folderIcon: {
    fontSize: 18,
  },
  folderName: {
    ...typography.body,
    flex: 1,
  },
  folderNameSelected: {
    fontWeight: '600',
  },
  check: {
    marginLeft: spacing.xs,
  },
});
