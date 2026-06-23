import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import BrandLogo from '../../components/brand/BrandLogo';
import { colors } from '../../constants/theme';

export default function SplashScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />

      <View style={styles.card}>
        <View style={styles.center}>
          <BrandLogo center subtitle="" />
          <Text style={styles.title}>Kết nối cộng đồng</Text>
          <Text style={styles.desc}>
            Kiến tạo tương lai đô thị thông minh và bền vững.
          </Text>
        </View>

        <View style={styles.loadingArea}>
          <View style={styles.loadingBar} />
          <Text style={styles.loadingText}>ĐANG KHỞI TẠO</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundBlue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 310,
    height: 460,
    borderRadius: 180,
    borderWidth: 22,
    borderColor: 'rgba(37, 99, 235, 0.10)',
    backgroundColor: 'rgba(147, 197, 253, 0.12)',
  },
  glowTop: {
    top: -135,
    left: -120,
    transform: [{ rotate: '-10deg' }],
  },
  glowBottom: {
    bottom: -125,
    right: -125,
    transform: [{ rotate: '-12deg' }],
  },
  card: {
    width: '82%',
    height: '76%',
    backgroundColor: '#F9FBFF',
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 230,
    paddingBottom: 54,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  title: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  desc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  loadingArea: {
    alignItems: 'center',
  },
  loadingBar: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
    marginBottom: 18,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.lightMuted,
  },
});