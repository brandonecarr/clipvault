import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme/theme';
import { useThemeColors } from '../../theme/theme';
import { useUIStore } from '../../stores/uiStore';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

function SettingRow({ icon, label, value, onPress, trailing, destructive }: SettingRowProps) {
  const themeColors = useThemeColors();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: destructive ? '#FFF0EE' : '#F0EDFF' }]}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? colors.error : colors.primary}
        />
      </View>
      <Text style={[styles.rowLabel, { color: destructive ? colors.error : themeColors.text }]}>
        {label}
      </Text>
      {value && (
        <Text style={[styles.rowValue, { color: themeColors.textSecondary }]}>{value}</Text>
      )}
      {trailing ?? (
        onPress ? (
          <Ionicons name="chevron-forward" size={16} color={themeColors.textSecondary} />
        ) : null
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { user, logout } = useAuth();
  const { viewMode, setViewMode } = useUIStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>

        {/* Profile section */}
        <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>
                {user?.displayName ?? 'You'}
              </Text>
              <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>
                {user?.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Appearance section */}
        <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
          <SettingRow
            icon="grid-outline"
            label="Default View"
            value={viewMode === 'grid' ? 'Grid' : 'List'}
            trailing={
              <Switch
                value={viewMode === 'grid'}
                onValueChange={(v) => setViewMode(v ? 'grid' : 'list')}
                trackColor={{ true: colors.primary, false: themeColors.border }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </View>

        {/* Library section */}
        <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Library</Text>
        <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
          <SettingRow
            icon="pricetag-outline"
            label="Manage Tags"
            onPress={() => {/* TODO: navigate to tag manager */}}
          />
        </View>

        {/* Account section */}
        <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.sm]}>
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleLogout}
            destructive
          />
        </View>

        {/* About */}
        <Text style={[styles.versionText, { color: themeColors.textSecondary }]}>
          ClipVault v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    ...typography.body,
    flex: 1,
  },
  rowValue: {
    ...typography.body,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  profileEmail: {
    ...typography.caption,
  },

  versionText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
