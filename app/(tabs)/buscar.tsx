import { useRef, useState } from 'react';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchMedidorAPI } from '../../src/api/mockapi';
import type { MedidorCache } from '../../src/database/sqlite';
import {
  getMedidorCache,
  saveMedidorCache,
} from '../../src/database/sqlite';

const METER_CODE_PATTERN = /^MED-\d{6}$/;

type SearchSource = 'cache' | 'mockapi';

const METER_FIELDS: { key: keyof Omit<MedidorCache, 'codigo'>; label: string }[] = [
  { key: 'direccion', label: 'Dirección' },
  { key: 'sector', label: 'Sector' },
  { key: 'numero_cuenta', label: 'Número de cuenta' },
  { key: 'estado_actual', label: 'Estado actual' },
  { key: 'ultima_lectura', label: 'Última lectura' },
  { key: 'fecha_ultima_lectura', label: 'Fecha de última lectura' },
  { key: 'consumo_promedio', label: 'Consumo promedio' },
];

export default function BuscarScreen() {
  const [codigo, setCodigo] = useState('');
  const [hasEditedCode, setHasEditedCode] = useState(false);
  const [medidor, setMedidor] = useState<MedidorCache | null>(null);
  const [origen, setOrigen] = useState<SearchSource | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const backgroundRef = useRef<View | null>(null);
  const isValidCode = METER_CODE_PATTERN.test(codigo);

  async function buscarMedidor() {
    if (!isValidCode || isSearching) {
      return;
    }

    setIsSearching(true);
    setMedidor(null);
    setOrigen(null);
    setMensaje('');

    try {
      const medidorEnCache = await getMedidorCache(codigo);

      if (medidorEnCache) {
        setMedidor(medidorEnCache);
        setOrigen('cache');
        return;
      }

      let medidorRemoto: MedidorCache;

      try {
        medidorRemoto = await fetchMedidorAPI(codigo);
      } catch (error) {
        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error &&
            /UnknownHostException|Network request failed|Failed to fetch/i.test(
              error.message,
            ));

        if (isNetworkError) {
          Alert.alert(
            'Error',
            'No hay conexión a internet y el medidor no se encuentra en la memoria caché del teléfono.',
          );
          return;
        }

        throw error;
      }

      await saveMedidorCache(medidorRemoto);
      setMedidor(medidorRemoto);
      setOrigen('mockapi');
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : 'No se pudo buscar el medidor por un error inesperado.',
      );
    } finally {
      setIsSearching(false);
    }
  }

  const validationMessage = hasEditedCode && !isValidCode
    ? codigo.length === 0
      ? 'Ingresa un código con el formato MED-123456.'
      : 'El código debe ser exactamente MED- seguido de 6 dígitos.'
    : '';

  return (
    <View style={styles.screen}>
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
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CONSULTA DE SERVICIO</Text>
          <Text style={styles.title}>Buscar medidor</Text>
          <Text style={styles.description}>
            Ingresa el código para consultar su información y preparar una nueva
            lectura.
          </Text>
        </View>

        <View style={styles.searchPanel}>
          <BlurView
            blurMethod="dimezisBlurView"
            blurTarget={backgroundRef}
            intensity={95}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            tint="light"
          />
        <Text style={styles.inputLabel}>Código del medidor</Text>
        <TextInput
          accessibilityLabel="Código del medidor"
          accessibilityHint="Formato requerido: MED- seguido de seis dígitos."
          autoCapitalize="none"
          editable={!isSearching}
          maxLength={10}
          onBlur={() => setIsCodeFocused(false)}
          onChangeText={(value) => {
            setCodigo(value);
            setHasEditedCode(true);
            setMedidor(null);
            setOrigen(null);
            setMensaje('');
          }}
          onFocus={() => setIsCodeFocused(true)}
          placeholder="MED-123456"
          placeholderTextColor="#577083"
          style={[
            styles.input,
            isCodeFocused && styles.inputFocused,
            !!validationMessage && styles.inputInvalid,
          ]}
          value={codigo}
        />
        {!!validationMessage && (
          <Text accessibilityRole="alert" style={styles.validationMessage}>
            {validationMessage}
          </Text>
        )}
        {isValidCode || isSearching ? (
          <Pressable
            accessibilityRole="button"
            disabled={!isValidCode || isSearching}
            onPress={() => void buscarMedidor()}
            style={({ pressed }) => [
              styles.searchButton,
              pressed && isValidCode && styles.searchButtonPressed,
            ]}
          >
            <LinearGradient
              colors={isSearching ? ['#6F8797', '#647D8D'] : ['#087EA4', '#075985']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.searchButtonText}>
                {isSearching ? 'Buscando medidor...' : 'Buscar medidor'}
              </Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <View
            accessible
            accessibilityLabel="Ingresa un código con el formato MED-123456 para habilitar la búsqueda."
            style={styles.lockedAction}
          >
            <Ionicons
              color="#07131f"
              name="search-outline"
              size={18}
              style={styles.lockedActionIcon}
            />
            <Text style={styles.lockedActionText}>
              Completa un código válido para buscar
            </Text>
          </View>
        )}
        </View>

        {!!mensaje && (
          <View style={styles.errorPanel}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {mensaje}
            </Text>
          </View>
        )}

        {medidor && (
        <View style={styles.resultCard}>
          <BlurView
            blurMethod="dimezisBlurView"
            blurTarget={backgroundRef}
            intensity={95}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            tint="light"
          />
          <View style={styles.resultHeader}>
            <View style={styles.resultHeading}>
              <Text style={styles.resultEyebrow}>MEDIDOR ENCONTRADO</Text>
              <Text style={styles.resultCode}>{medidor.codigo}</Text>
            </View>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceText}>
                {origen === 'cache' ? 'SQLite · Caché' : 'MockAPI · Guardado'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />
          {METER_FIELDS.map(({ key, label }, index) => (
            <View
              key={key}
              style={[
                styles.dataRow,
                index === METER_FIELDS.length - 1 && styles.lastDataRow,
              ]}
            >
              <Text style={styles.dataLabel}>{label}</Text>
              <Text style={styles.dataValue}>{String(medidor[key])}</Text>
            </View>
          ))}

          <Link
            asChild
            href={{
              pathname: '/lectura/[id]',
              params: { id: medidor.codigo },
            }}
          >
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.registerButton,
                pressed && styles.registerButtonPressed,
              ]}
            >
              <LinearGradient
                colors={['#087EA4', '#075985']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.registerButtonGradient}
              >
                <Text style={styles.registerButtonText}>Registrar lectura</Text>
                <Text accessibilityElementsHidden style={styles.registerArrow}>
                  →
                </Text>
              </LinearGradient>
            </Pressable>
          </Link>
        </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  hero: {
    marginBottom: 22,
    paddingHorizontal: 3,
    paddingVertical: 6,
  },
  eyebrow: {
    marginBottom: 8,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    marginBottom: 8,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  searchPanel: {
    position: 'relative',
    overflow: 'hidden',
    padding: 19,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 26,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    shadowColor: '#123B5D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  inputLabel: {
    marginBottom: 9,
    color: '#102A43',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  input: {
    minHeight: 54,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#C8D2DA',
    borderRadius: 15,
    backgroundColor: '#9ab3c95d',
    color: '#102A43',
    fontSize: 17,
    fontFamily: 'monospace',
    fontWeight: '600',
    letterSpacing: 1,
  },
  inputFocused: {
    borderColor: '#9AAAB5',
    backgroundColor: '#D7E0E6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  inputInvalid: {
    borderColor: '#C4473A',
  },
  validationMessage: {
    marginTop: 8,
    color: '#B42318',
    fontSize: 13,
    lineHeight: 19,
  },
  searchButton: {
    minHeight: 50,
    overflow: 'hidden',
    marginTop: 14,
    borderRadius: 16,
    shadowColor: '#087EA4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonGradient: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedAction: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  lockedActionIcon: {
    marginRight: 7,
  },
  lockedActionText: {
    color: '#334E68',
    fontSize: 12,
  },
  searchButtonPressed: {
    opacity: 0.82,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorPanel: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0C6C2',
    borderRadius: 12,
    backgroundColor: '#FFF4F2',
  },
  errorText: {
    color: '#A52A20',
    fontSize: 14,
    lineHeight: 20,
  },
  resultCard: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 26,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    shadowColor: '#123B5D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  resultHeading: {
    flexShrink: 1,
    marginRight: 8,
  },
  resultEyebrow: {
    marginBottom: 4,
    color: '#091724',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  resultCode: {
    color: '#081c30',
    fontSize: 21,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  sourceBadge: {
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgb(162, 205, 240)',
  },
  sourceText: {
    color: '#020b14',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginBottom: 4,
    backgroundColor: 'rgba(166, 175, 182, 0.7)',
  },
  dataRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 42, 67, 0.21)',
  },
  lastDataRow: {
    borderBottomWidth: 0,
  },
  dataLabel: {
    flex: 1,
    marginRight: 12,
    color: '#061829',
    fontSize: 13,
  },
  dataValue: {
    flex: 1,
    color: '#102A43',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  registerButton: {
    minHeight: 54,
    overflow: 'hidden',
    marginTop: 18,
    borderRadius: 16,
    shadowColor: '#087EA4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  registerButtonGradient: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonPressed: {
    opacity: 0.84,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  registerArrow: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
