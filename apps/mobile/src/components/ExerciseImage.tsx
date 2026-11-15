import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { EXERCISE_IMAGES_FEMALE } from '../features/exercises/images.female.generated';
import { EXERCISE_IMAGES } from '../features/exercises/images.generated';
import { useGender } from '../features/profile/gender';
import { colors, radius } from '../theme';

interface Props {
  exerciseId: string;
  size?: number | '100%';
  height?: number;
  /** Tap to switch between the start and end position photos. */
  toggleable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Exercise photo, or a placeholder icon when there is none. Female members see
 * a female photo when one exists for the exercise.
 */
export function ExerciseImage({ exerciseId, size = 64, height, toggleable, style }: Props) {
  const gender = useGender();
  const images = (gender === 'female' && EXERCISE_IMAGES_FEMALE[exerciseId]) || EXERCISE_IMAGES[exerciseId] || [];
  const [frame, setFrame] = useState(0);
  const box = { width: size, height: height ?? (typeof size === 'number' ? size : 200) };

  if (images.length === 0) {
    return (
      <View style={[styles.placeholder, box, style]}>
        <Ionicons name="barbell-outline" size={28} color={colors.primary} />
      </View>
    );
  }
  const image = (
    <Image
      source={images[frame % images.length]}
      style={[styles.image, box]}
      contentFit="cover"
      transition={150}
      accessibilityIgnoresInvertColors
    />
  );
  if (!toggleable || images.length < 2) return <View style={[styles.wrap, box, style]}>{image}</View>;
  return (
    <Pressable style={[styles.wrap, box, style]} onPress={() => setFrame((f) => f + 1)} accessibilityRole="imagebutton">
      {image}
      <View style={styles.dots}>
        {images.map((_, i) => (
          <View key={i} style={[styles.dot, i === frame % images.length && styles.dotActive]} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#fff' },
  image: { borderRadius: radius.md },
  placeholder: {
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)' },
  dotActive: { backgroundColor: colors.primary },
});
