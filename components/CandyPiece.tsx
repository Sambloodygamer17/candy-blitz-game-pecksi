
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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
  }, [isSelected]);

  useEffect(() => {
    if (candy.isMatched) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [candy.isMatched]);

  const candyColor = getCandyColor(candy.type);

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
            transform: [{ scale: scaleAnim }],
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
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
    elevation: 4,
  },
});
