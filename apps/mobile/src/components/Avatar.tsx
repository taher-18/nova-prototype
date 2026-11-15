import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { API_URL } from '../config';
import { colors } from '../theme';
import { AppText } from './AppText';

/** Local-storage avatars come back as "/uploads/..." — resolve against the API. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

function initials(name: string | null | undefined, email: string | undefined) {
  const source = name?.trim() || email?.split('@')[0] || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : source.slice(0, 2)).toUpperCase();
}

interface Props {
  url: string | null | undefined;
  name?: string | null;
  email?: string;
  size?: number;
}

/** Profile picture, or the member's initials on a coloured circle. */
export function Avatar({ url, name, email, size = 72 }: Props) {
  const uri = resolveMediaUrl(url);
  const circle = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image source={{ uri }} style={[styles.base, circle]} contentFit="cover" transition={150} />;
  }
  return (
    <View style={[styles.base, styles.fallback, circle]}>
      <AppText variant="title" color={colors.onPrimary} style={{ fontSize: size * 0.36, lineHeight: size * 0.5 }}>
        {initials(name, email)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surface },
  fallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
