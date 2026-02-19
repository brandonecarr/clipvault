import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme/theme';
import { useThemeColors } from '../theme/theme';

interface Crumb {
  id: string;
  name: string;
}

interface BreadcrumbBarProps {
  crumbs: Crumb[];
}

export default function BreadcrumbBar({ crumbs }: BreadcrumbBarProps) {
  const router = useRouter();
  const themeColors = useThemeColors();

  const handleCrumbPress = (index: number, crumb: Crumb) => {
    if (index === crumbs.length - 1) return; // Current folder — don't navigate

    if (index === -1) {
      // Home
      router.push('/(tabs)/');
    } else {
      router.push(`/folder/${crumb.id}`);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.container}
    >
      {/* Home crumb */}
      <TouchableOpacity
        style={styles.crumb}
        onPress={() => handleCrumbPress(-1, { id: '', name: 'Home' })}
        disabled={crumbs.length === 0}
      >
        <Ionicons
          name="home-outline"
          size={14}
          color={crumbs.length === 0 ? themeColors.text : colors.primary}
        />
      </TouchableOpacity>

      {crumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <Ionicons
            name="chevron-forward"
            size={12}
            color={themeColors.textSecondary}
            style={styles.separator}
          />
          <TouchableOpacity
            style={styles.crumb}
            onPress={() => handleCrumbPress(index, crumb)}
            disabled={index === crumbs.length - 1}
          >
            <Text
              style={[
                styles.crumbText,
                {
                  color:
                    index === crumbs.length - 1 ? themeColors.text : colors.primary,
                  fontWeight: index === crumbs.length - 1 ? '600' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {crumb.name}
            </Text>
          </TouchableOpacity>
        </React.Fragment>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  crumb: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  separator: {
    marginHorizontal: 2,
  },
  crumbText: {
    ...typography.caption,
  },
});
