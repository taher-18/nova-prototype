import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from '../theme';
import { AppText } from './AppText';

export interface SheetAction {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
}

/**
 * A menu that slides up from the bottom. Used instead of Alert for menus,
 * because Android alerts show at most three buttons.
 */
export function ActionSheet({ visible, title, actions, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={t('common.cancel')} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        {title ? (
          <AppText variant="label" color={colors.muted} center numberOfLines={2} style={styles.title}>
            {title}
          </AppText>
        ) : null}
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => {
              onClose();
              a.onPress();
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceAlt }]}
            accessibilityRole="button"
          >
            <Ionicons name={a.icon} size={22} color={a.destructive ? colors.danger : colors.text} />
            <AppText variant="label" color={a.destructive ? colors.danger : colors.text}>{a.label}</AppText>
          </Pressable>
        ))}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.row, styles.cancel, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <AppText variant="label" center style={{ flex: 1 }}>{t('common.cancel')}</AppText>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingTop: space.md,
    gap: 2,
  },
  title: { paddingBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  cancel: { marginTop: space.sm, backgroundColor: colors.surfaceAlt },
});
