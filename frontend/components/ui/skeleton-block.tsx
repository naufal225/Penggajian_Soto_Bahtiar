import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type StyleProp, View, type ViewStyle } from 'react-native';

interface SkeletonBlockProps {
  style?: StyleProp<ViewStyle>;
}

export default function SkeletonBlock({ style }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View style={[styles.wrapper, { opacity }, style]}>
      <View style={styles.inner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: '#DDE5EE',
  },
  inner: {
    flex: 1,
    backgroundColor: '#EEF3F8',
  },
});
