import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { HomeGymField, homeGymValue } from '../../features/homeGym/HomeGymField';
import { errorKey } from '../../lib/api';
import { PROTOTYPE } from '../../prototype/config';
import { space } from '../../theme';

const AVATAR_SIZE = 512;

/** Square crop (from the picker), resized to 512px and compressed to JPEG. */
async function pickAndPrepareAvatar(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  // Center-crop to a square in case the platform editor didn't.
  const side = Math.min(asset.width, asset.height);
  if (asset.width !== asset.height) {
    context.crop({ originX: (asset.width - side) / 2, originY: (asset.height - side) / 2, width: side, height: side });
  }
  context.resize({ width: AVATAR_SIZE, height: AVATAR_SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return saved.uri;
}

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user, api, updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<{ homeGym: string | null }>('/v1/me/profile'),
  });
  const [name, setName] = useState(user?.displayName ?? '');
  const [gym, setGym] = useState('');
  const [gymError, setGymError] = useState(false);
  const savedGym = profile.data?.homeGym ?? '';
  useEffect(() => setGym(savedGym), [savedGym]);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changePhoto() {
    setError(null);
    try {
      const uri = await pickAndPrepareAvatar();
      if (uri === 'denied') return Alert.alert(t('profileEdit.photoPermission'));
      if (!uri) return;
      setPhotoBusy(true);
      await uploadAvatar(uri);
    } catch {
      setError(t('profileEdit.uploadFailed'));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function deletePhoto() {
    setPhotoBusy(true);
    try {
      await removeAvatar();
    } catch (err) {
      setError(t(errorKey(err) as 'errors.unknown'));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    const gymName = homeGymValue(gym);
    if (gymName === 'invalid') return setGymError(true);
    setGymError(false);
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ displayName: name.trim() || null });
      if (profile.data && gymName !== (profile.data.homeGym ?? null)) {
        await api.put('/v1/me/home-gym', { name: gymName });
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
      }
      router.back();
    } catch (err) {
      setError(t(errorKey(err) as 'errors.unknown'));
      setSaving(false);
    }
  }

  return (
    <Screen edges={['bottom']} footer={<Button title={t('common.save')} loading={saving} onPress={save} />}>
      <Stack.Screen options={{ title: t('profileEdit.title') }} />
      <View style={styles.avatar}>
        <Avatar url={user?.avatarUrl} name={name || user?.displayName} email={user?.email} size={120} />
        {/* Photos need the server; not part of prototype mode. */}
        {PROTOTYPE ? null : (
        <View style={styles.photoButtons}>
          <Button
            title={user?.avatarUrl ? t('profileEdit.changePhoto') : t('profileEdit.addPhoto')}
            variant="secondary"
            loading={photoBusy}
            onPress={changePhoto}
          />
          {user?.avatarUrl ? (
            <Button title={t('profileEdit.removePhoto')} variant="ghost" disabled={photoBusy} onPress={deletePhoto} />
          ) : null}
        </View>
        )}
      </View>
      <ErrorBanner message={error} />
      <TextField label={t('profileEdit.name')} value={name} onChangeText={setName} maxLength={60} autoComplete="name" />
      {profile.data ? (
        <HomeGymField value={gym} onChange={setGym} error={gymError ? t('homeGym.invalid') : null} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', gap: space.md, marginTop: space.lg },
  photoButtons: { alignSelf: 'stretch', gap: space.xs },
});
