import type { Ionicons } from '@expo/vector-icons';
import type { DayStatus } from '@gymapp/shared';
import type { ComponentProps } from 'react';
import { colors } from '../../theme';

/** One visual language for day statuses (week strip, calendar, day screen). */
export const DAY_STYLE: Record<
  DayStatus,
  { bg: string; fg: string; border: string; icon: ComponentProps<typeof Ionicons>['name'] | null }
> = {
  done: { bg: colors.success, fg: colors.onPrimary, border: colors.success, icon: 'checkmark' },
  missed: { bg: colors.dangerSoft, fg: colors.danger, border: colors.danger, icon: 'close' },
  today: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary, icon: 'barbell' },
  upcoming: { bg: 'transparent', fg: colors.text, border: colors.primary, icon: null },
  rest: { bg: colors.surfaceAlt, fg: colors.muted, border: 'transparent', icon: null },
};
