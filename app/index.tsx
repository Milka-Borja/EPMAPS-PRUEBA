import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';

export default function IndexRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState<'employeeCode' | 'password' | null>(null);
  const backgroundRef = useRef<View | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/buscar');
    }
  }, [isAuthenticated]);

  function handleLogin() {
    if (employeeCode !== 'EMP-001' || password !== '1234') {
      Alert.alert('Credenciales incorrectas');
      return;
    }

    login('EMP-001', '1234');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BlurTargetView ref={backgroundRef} style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#081B3A', '#0D4FA1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.backgroundCircleLarge} />
        <View pointerEvents="none" style={styles.backgroundCircleSmall} />
      </BlurTargetView>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={['#081B3A', '#0D4FA1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandPanel}
          >
            <View pointerEvents="none" style={styles.orbitLarge} />
            <View pointerEvents="none" style={styles.orbitSmall} />
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <View style={styles.brandMarkLine} />
                <View style={styles.brandMarkLineShort} />
              </View>
              <View>
                <Text style={styles.brandName}>EPMAPS</Text>
                <Text style={styles.brandSubtitle}>AGUA DE QUITO</Text>
              </View>
            </View>
            <View style={styles.accentRule} />
            <Text style={styles.eyebrow}>OPERACIÓN EN CAMPO</Text>
            <Text style={styles.welcomeTitle}>Bienvenido de vuelta</Text>
            <Text style={styles.welcomeCopy}>
              Ingresa con tus credenciales institucionales para continuar.
            </Text>
          </LinearGradient>

          <View style={styles.formCard}>
            <BlurView
              blurMethod="dimezisBlurView"
              blurTarget={backgroundRef}
              intensity={95}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              tint="light"
            />
            <View style={styles.formHeadingRow}>
              <View style={styles.formHeadingAccent} />
              <View>
                <Text style={styles.formTitle}>Iniciar sesión</Text>
                <Text style={styles.formSubtitle}>
                  Acceso para personal técnico
                </Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Código de Empleado</Text>
              <TextInput
                accessibilityLabel="Código de Empleado"
                autoCapitalize="characters"
                autoComplete="username"
                autoCorrect={false}
                onBlur={() => setFocusedField(null)}
                onChangeText={setEmployeeCode}
                onFocus={() => setFocusedField('employeeCode')}
                placeholder="Ej. EMP-0248"
                placeholderTextColor="#577083"
                returnKeyType="next"
                style={[
                  styles.input,
                  focusedField === 'employeeCode' && styles.inputFocused,
                ]}
                value={employeeCode}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Clave</Text>
              <TextInput
                accessibilityLabel="Clave"
                autoComplete="current-password"
                onBlur={() => setFocusedField(null)}
                onChangeText={setPassword}
                onFocus={() => setFocusedField('password')}
                onSubmitEditing={handleLogin}
                placeholder="Ingresa tu clave"
                placeholderTextColor="#577083"
                returnKeyType="go"
                secureTextEntry
                style={[
                  styles.input,
                  focusedField === 'password' && styles.inputFocused,
                ]}
                value={password}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={handleLogin}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.loginButtonPressed,
              ]}
            >
              <LinearGradient
                colors={['#087EA4', '#075985']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}
              >
                <Text style={styles.loginButtonText}>Ingresar</Text>
                <Ionicons
                  accessibilityElementsHidden
                  color="#FFFFFF"
                  name="arrow-forward"
                  size={20}
                  style={styles.loginButtonArrow}
                />
              </LinearGradient>
            </Pressable>

            <View style={styles.securityNote}>
              <View style={styles.securityDot} />
              <Text style={styles.securityText}>
                Usa tu cuenta institucional de EPMAPS
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>SERVICIO DE AGUA POTABLE · QUITO</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backgroundCircleLarge: {
    position: 'absolute',
    top: 100,
    right: -112,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backgroundCircleSmall: {
    position: 'absolute',
    bottom: 116,
    left: -76,
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  brandPanel: {
    minHeight: 260,
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 28,
    borderRadius: 26,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(0,210,211,0.78)',
  },
  brandMarkLine: {
    width: 20,
    height: 4,
    marginBottom: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  brandMarkLineShort: {
    width: 13,
    height: 4,
    marginLeft: -7,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  brandSubtitle: {
    marginTop: 2,
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  accentRule: {
    width: 42,
    height: 3,
    marginTop: 24,
    marginBottom: 15,
    borderRadius: 2,
    backgroundColor: '#00D2D3',
  },
  eyebrow: {
    marginBottom: 7,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  welcomeCopy: {
    maxWidth: 280,
    marginTop: 7,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  orbitLarge: {
    position: 'absolute',
    right: -42,
    top: 75,
    width: 132,
    height: 132,
    borderWidth: 1,
    borderColor: 'rgba(125, 217, 229, 0.26)',
    borderRadius: 66,
  },
  orbitSmall: {
    position: 'absolute',
    right: 9,
    top: 117,
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(125, 217, 229, 0.34)',
    borderRadius: 24,
  },
  formCard: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 21,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    elevation: 3,
    shadowColor: '#123B5D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  formHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  formHeadingAccent: {
    width: 4,
    height: 37,
    marginRight: 12,
    borderRadius: 2,
    backgroundColor: '#00BFC2',
  },
  formTitle: {
    color: '#08223a',
    fontSize: 20,
    fontWeight: '700',
  },
  formSubtitle: {
    marginTop: 3,
    color: '#142f47',
    fontSize: 13,
  },
  fieldGroup: {
    marginBottom: 17,
  },
  label: {
    marginBottom: 8,
    color: '#102A43',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#C8D2DA',
    borderRadius: 14,
    backgroundColor: '#9ab3c95d',
    color: '#010911',
    fontSize: 16,
  },
  inputFocused: {
    borderColor: '#9AAAB5',
    backgroundColor: '#D7E0E6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  loginButton: {
    minHeight: 56,
    overflow: 'hidden',
    borderRadius: 16,
    shadowColor: '#087EA4',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 3,
  },
  loginButtonGradient: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginButtonPressed: {
    opacity: 0.82,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loginButtonArrow: {
    position: 'absolute',
    right: 18,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  securityDot: {
    width: 6,
    height: 6,
    marginRight: 7,
    borderRadius: 3,
    backgroundColor: '#00BFC2',
  },
  securityText: {
    color: '#0c2741',
    fontSize: 12,
  },
  footer: {
    marginTop: 24,
    color: '#D7E5F0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});
