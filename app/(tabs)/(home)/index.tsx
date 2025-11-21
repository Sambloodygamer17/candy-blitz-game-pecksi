
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { GameBoard } from '@/components/GameBoard';
import { colors } from '@/styles/commonStyles';
import { useFonts, Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trinity Match</Text>
      <Text style={styles.subtitle}>Match 3 or more candies!</Text>
      <GameBoard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#4169E1',
    marginTop: Platform.OS === 'android' ? 20 : 60,
    marginBottom: 8,
    fontFamily: 'Nunito_800ExtraBold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
    fontFamily: 'Nunito_700Bold',
  },
});
