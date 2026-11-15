import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AppState, Platform, Vibration } from 'react-native';
import i18n from '../../i18n';
import { NOTIFICATIONS } from '../../prototype/config';

/** Haptics are a nice-to-have: never let them break a workout. */
export const haptic = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  record: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
};

const REST_NOTIFICATION = 'rest-timer';

/** Shows notifications as banners, except the rest timer while the app is open (we vibrate instead). */
export function configureNotifications() {
  if (!NOTIFICATIONS) return;
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const inApp = AppState.currentState === 'active' && n.request.content.data?.type === REST_NOTIFICATION;
      return { shouldShowBanner: !inApp, shouldShowList: !inApp, shouldPlaySound: !inApp, shouldSetBadge: false };
    },
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!NOTIFICATIONS) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

let scheduledRestId: string | null = null;

/** Schedules the "rest is over" notification so it fires even if the phone is locked. */
export async function scheduleRestNotification(seconds: number) {
  await cancelRestNotification();
  if (seconds < 1 || !NOTIFICATIONS) return;
  try {
    scheduledRestId = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('workout.restOverTitle'),
        body: i18n.t('workout.restOverBody'),
        sound: true,
        data: { type: REST_NOTIFICATION },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(seconds) },
    });
  } catch {
    scheduledRestId = null;
  }
}

export async function cancelRestNotification() {
  const id = scheduledRestId;
  scheduledRestId = null;
  if (id) await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/** Rest finished while the app is open. */
export function restOverInApp() {
  Vibration.vibrate(Platform.OS === 'android' ? [0, 350, 150, 350] : [0, 350]);
  void haptic.success();
}
