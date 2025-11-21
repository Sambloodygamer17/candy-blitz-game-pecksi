
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Candy } from '@/types/game';
import { getCandyColor } from '@/utils/gameLogic';

interface CandyPieceProps {
  candy: Candy;
  size: number;
  isSelected: boolean;
  onPress: () => void;
}

export const CandyPiece: React.FC<CandyPieceProps> = ({ candy, size, isSelected, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isSelected, scaleAnim]);

  useEffect(() => {
    if (candy.isMatched) {
      // Breaking animation - scale down, rotate, and fade out while falling
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 100,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when candy is not matched
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
      rotateAnim.setValue(0);
      translateYAnim.setValue(0);
    }
  }, [candy.isMatched, scaleAnim, opacityAnim, rotateAnim, translateYAnim]);

  const candyColor = getCandyColor(candy.type);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, { width: size, height: size }]}
    >
      <Animated.View
        style={[
          styles.candy,
          {
            backgroundColor: candyColor,
            transform: [
              { scale: scaleAnim },
              { rotate: rotate },
              { translateY: translateYAnim },
            ],
            opacity: opacityAnim,
            borderColor: isSelected ? '#FFFFFF' : candyColor,
            borderWidth: isSelected ? 3 : 0,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  candy: {
    width: '90%',
    height: '90%',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
});
