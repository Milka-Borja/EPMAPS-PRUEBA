import { useCallback, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getLecturas,
  type LecturaLocal,
} from '../../src/database/sqlite';

export default function PendientesScreen() {
  const [lecturas, setLecturas] = useState<LecturaLocal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const isScreenFocused = useRef(false);
  const requestId = useRef(0);
  const backgroundRef = useRef<View | null>(null);

  const reloadLecturas = useCallback(() => {
    if (!isScreenFocused.current) {
      return;
    }

    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setError(null);

    void getLecturas()
      .then((result) => {
        if (
          isScreenFocused.current &&
          currentRequestId === requestId.current
        ) {
          setLecturas(result);
        }
      })
      .catch((reason: unknown) => {
        if (
          isScreenFocused.current &&
          currentRequestId === requestId.current
        ) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No se pudieron cargar las lecturas.',
          );
        }
      })
      .finally(() => {
        if (
          isScreenFocused.current &&
          currentRequestId === requestId.current
        ) {
          setIsLoading(false);
        }
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      reloadLecturas();
      return () => {
        isScreenFocused.current = false;
        requestId.current += 1;
      };
    }, [reloadLecturas]),
  );

  function abrirLectura(lectura: LecturaLocal) {
    if (lectura.estado_sync !== 'PENDIENTE') {
      return;
    }

    router.push({
      pathname: '/lectura/[id]',
      params: {
        id: lectura.codigo_medidor,
        lecturaId: String(lectura.id),
      },
    });
  }

  function renderLectura({ item }: { item: LecturaLocal }) {
    const isSent = item.estado_sync === 'ENVIADO';

    return (
      <View style={[styles.card, isSent && styles.sentCard]}>
        <BlurView
          blurMethod="dimezisBlurView"
          blurTarget={backgroundRef}
          intensity={95}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          tint="light"
        />
        <View style={styles.cardHeader}>
          <View style={styles.cardHeading}>
            <Text style={styles.cardEyebrow}>MEDIDOR</Text>
            <Text style={styles.meterCode}>{item.codigo_medidor}</Text>
          </View>
          <View
            accessible
            accessibilityLabel={isSent ? 'Enviado' : 'Pendiente'}
            style={[
              styles.statusIcon,
              isSent ? styles.sentStatusIcon : styles.pendingStatusIcon,
            ]}
          >
            <Ionicons
              color={isSent ? '#087F83' : '#B5473A'}
              name={isSent ? 'checkmark-circle-outline' : 'time-outline'}
              size={24}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.details}>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Periodo</Text>
            <Text style={styles.detailValue}>{item.mes_anio}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Estado del medidor</Text>
            <Text style={styles.detailValue}>{item.estado_medidor}</Text>
          </View>
          <View style={styles.detail}>
            <Text style={styles.detailLabel}>Lectura</Text>
            <Text style={styles.detailValue}>
              {item.lectura_actual ?? 'No registrada'}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {isSent ? (
            <View
              accessible
              accessibilityLabel={`Lectura enviada del medidor ${item.codigo_medidor}. No se puede corregir.`}
              style={styles.lockedAction}
            >
              <Ionicons
                color="#087F83"
                name="checkmark-circle-outline"
                size={17}
                style={styles.lockIcon}
              />
              <Text style={styles.lockedActionText}>
                Registro sincronizado
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Editar lectura pendiente del medidor ${item.codigo_medidor}`}
              onPress={() => abrirLectura(item)}
              style={({ pressed }) => [
                styles.action,
                item.foto_uri && styles.actionWithImage,
                pressed && styles.pressedAction,
              ]}
            >
              <LinearGradient
                colors={['#087EA4', '#075985']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionGradient}
              >
                <Text style={styles.actionText}>Editar lectura</Text>
                <Ionicons
                  accessibilityElementsHidden
                  color="#FFFFFF"
                  name="arrow-forward"
                  size={18}
                  style={styles.actionArrow}
                />
              </LinearGradient>
            </Pressable>
          )}
          {!!item.foto_uri && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver foto del medidor ${item.codigo_medidor}`}
              onPress={() => setImageUri(item.foto_uri)}
              style={({ pressed }) => [
                styles.viewImageButton,
                pressed && styles.pressedImageButton,
              ]}
            >
              <Ionicons color="#102A43" name="camera-outline" size={21} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

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
      <FlatList
        data={lecturas}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderLectura}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>GESTIÓN DE REGISTROS</Text>
              <Text style={styles.title}>Lecturas</Text>
              <Text style={styles.description}>
                Consulta tus registros. Las lecturas pendientes se pueden editar;
                las enviadas quedan bloqueadas.
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {lecturas.length} {lecturas.length === 1 ? 'registro' : 'registros'}
                </Text>
              </View>
            </View>
            {!!error && (
              <View style={styles.errorCard}>
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {error}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={reloadLecturas}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryText}>Intentar de nuevo</Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.messageCard}>
            <BlurView
              blurMethod="dimezisBlurView"
              blurTarget={backgroundRef}
              intensity={95}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              tint="light"
            />
            {isLoading ? (
              <Text style={styles.messageText}>Cargando lecturas...</Text>
            ) : error ? (
              null
            ) : (
              <>
                <Text style={styles.emptyTitle}>Aún no hay lecturas</Text>
                <Text style={styles.messageText}>
                  Cuando registres una lectura aparecerá aquí.
                </Text>
              </>
            )}
          </View>
        }
        style={styles.list}
      />
      <Modal
        animationType="fade"
        onRequestClose={() => setImageUri(null)}
        transparent
        visible={imageUri !== null}
      >
        <View style={styles.imageModal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar imagen"
            onPress={() => setImageUri(null)}
            style={styles.closeImageButton}
          >
            <Ionicons color="#FFFFFF" name="close" size={24} />
          </Pressable>
          {imageUri && (
            <Image
              accessibilityLabel="Foto del registro"
              source={{ uri: imageUri }}
              resizeMode="contain"
              style={styles.fullImage}
            />
          )}
        </View>
      </Modal>
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
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  hero: {
    marginBottom: 18,
    paddingHorizontal: 3,
    paddingVertical: 6,
  },
  eyebrow: {
    marginBottom: 8,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    marginBottom: 7,
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  countBadge: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 26,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    elevation: 3,
    shadowColor: '#123B5D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  sentCard: {
    borderColor: 'rgba(255, 255, 255, 0.86)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeading: {
    flex: 1,
  },
  cardEyebrow: {
    marginBottom: 3,
    color: '#334E68',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  meterCode: {
    color: '#102A43',
    fontSize: 19,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  statusIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 20,
  },
  pendingStatusIcon: {
    backgroundColor: 'rgba(200,50,62,0.12)',
  },
  sentStatusIcon: {
    backgroundColor: 'rgba(8,127,131,0.12)',
  },
  divider: {
    height: 1,
    marginVertical: 14,
    backgroundColor: 'rgba(16,42,67,0.18)',
  },
  details: {
    marginBottom: 16,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    flex: 1,
    color: '#334E68',
    fontSize: 13,
  },
  detailValue: {
    flex: 1,
    color: '#102A43',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  action: {
    flex: 1,
    minHeight: 48,
    overflow: 'hidden',
    borderRadius: 15,
    shadowColor: '#087EA4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  actionWithImage: {
    marginRight: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionGradient: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  pressedAction: {
    opacity: 0.84,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockedAction: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(8,127,131,0.1)',
  },
  viewImageButton: {
    width: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#C8D2DA',
    backgroundColor: '#E4E9ED',
  },
  pressedImageButton: {
    opacity: 0.75,
  },
  imageModal: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  closeImageButton: {
    position: 'absolute',
    zIndex: 1,
    top: 56,
    right: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  lockIcon: {
    marginRight: 6,
  },
  lockedActionText: {
    color: '#087F83',
    fontSize: 11,
  },
  actionArrow: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  messageCard: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: 26,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    elevation: 3,
    shadowColor: '#123B5D',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  errorCard: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8B4AF',
    borderRadius: 16,
    backgroundColor: '#FFF4F2',
  },
  emptyTitle: {
    marginBottom: 6,
    color: '#102A43',
    fontSize: 17,
    fontWeight: '700',
  },
  messageText: {
    color: '#334E68',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#8F241D',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#005A9C',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
