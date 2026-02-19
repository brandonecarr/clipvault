import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography, spacing } from '../theme/theme';

interface TagChipProps {
  name: string;
  onRemove?: () => void;
  onPress?: () => void;
  selected?: boolean;
}

export default function TagChip({ name, onRemove, onPress, selected = false }: TagChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>#{name}</Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeButton}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <Ionicons name="close" size={12} color={selected ? '#FFFFFF' : colors.textSecondary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EDFF',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  text: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '500',
  },
  textSelected: {
    color: '#FFFFFF',
  },
  removeButton: {
    marginLeft: 2,
  },
});
