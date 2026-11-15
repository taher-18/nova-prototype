import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * Web-only fixes, imported once at startup.
 * React Native's Alert does nothing in a browser, so confirmations
 * ("Finish workout?") would never show. Use the browser's dialogs instead.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    const cancel = list.find((b) => b.style === 'cancel');
    const actions = list.filter((b) => b.style !== 'cancel');
    if (actions.length === 0) {
      window.alert(text);
      cancel?.onPress?.();
      return;
    }
    if (!cancel && actions.length === 1) {
      window.alert(text);
      actions[0]!.onPress?.();
      return;
    }
    if (window.confirm(text)) actions[actions.length - 1]!.onPress?.();
    else cancel?.onPress?.();
  };
}
