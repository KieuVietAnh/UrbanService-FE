import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { rawColors as colors } from '@/theme/colors';

export default function SplashScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.orbit, styles.orbitTop]} />
      <View style={[styles.orbit, styles.orbitBottom]} />

      <View style={styles.center}>
        <Image
          source={require('../../../assets/splash-logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="UrbanMind - Cổng phản ánh đô thị"
        />
      </View>

      <View style={styles.loadingArea}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>ĐANG KHỞI ĐỘNG</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orbit: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    borderWidth: 30,
    borderColor: 'rgba(37, 99, 235, 0.055)',
  },
  orbitTop: {
    top: -150,
    left: -145,
  },
  orbitBottom: {
    bottom: -155,
    right: -155,
  },
  center: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 1280 / 426,
  },
  loadingArea: {
    position: 'absolute',
    bottom: 64,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    fontFamily: 'Geist-SemiBold',
    fontSize: 11,
    letterSpacing: 2.2,
    color: colors.lightMuted,
  },
});
