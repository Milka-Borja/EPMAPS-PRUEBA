import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { postLecturaAPI } from '../src/api/mockapi';
import {
  getLecturasPendientes,
  initDB,
  markAsSent,
  updateLectura,
} from '../src/database/sqlite';
import { useSyncStore } from '../src/store/syncStore';

const CLOUDINARY_UPLOAD_URL =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_URL ?? '';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

async function uploadPhotoToCloudinary(photoUri: string): Promise<string> {
  if (!CLOUDINARY_UPLOAD_URL || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      'Define EXPO_PUBLIC_CLOUDINARY_UPLOAD_URL y EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET en el archivo .env.',
    );
  }

  const photoFile = new File(photoUri);
  const formData = new FormData();
  formData.append('file', photoFile, photoFile.name);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Error al subir la foto a Cloudinary: ${response.status}`);
  }

  const result: unknown = await response.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('secure_url' in result) ||
    typeof result.secure_url !== 'string' ||
    !result.secure_url
  ) {
    throw new Error('Cloudinary no devolvió una URL pública válida.');
  }

  return result.secure_url;
}

async function syncPendingReadings(
  setPendingCount: (pendingCount: number) => void,
): Promise<void> {
  try {
    const lecturasPendientes = await getLecturasPendientes();
    setPendingCount(lecturasPendientes.length);

    for (const lectura of lecturasPendientes) {
      try {
        let lecturaParaEnviar = lectura;

        if (lectura.foto_uri?.startsWith('file://')) {
          const fotoUrl = await uploadPhotoToCloudinary(lectura.foto_uri);
          await updateLectura(lectura.id, { foto_uri: fotoUrl });
          lecturaParaEnviar = { ...lectura, foto_uri: fotoUrl };
        }

        await postLecturaAPI(lecturaParaEnviar);
        await markAsSent(lectura.id);
      } catch (error) {
        console.error(
          `No se pudo sincronizar la lectura ${lectura.id}:`,
          error,
        );
      }
    }
  } catch (error) {
    console.error('No se pudieron sincronizar las lecturas pendientes:', error);
  } finally {
    try {
      const lecturasPendientes = await getLecturasPendientes();
      setPendingCount(lecturasPendientes.length);
    } catch (error) {
      console.error('No se pudo actualizar el contador de lecturas pendientes:', error);
    }
  }
}

export default function RootLayout() {
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const isSyncing = useRef(false);
  const syncAgain = useRef(false);
  const isConnected = useSyncStore((state) => state.isConnected);
  const setIsConnected = useSyncStore((state) => state.setIsConnected);
  const setPendingCount = useSyncStore((state) => state.setPendingCount);
  const syncRequestId = useSyncStore((state) => state.syncRequestId);
  const requestSync = useSyncStore((state) => state.requestSync);

  useEffect(() => {
    let isMounted = true;

    initDB()
      .then(() => {
        if (isMounted) {
          setIsDatabaseReady(true);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setDatabaseError(
            error instanceof Error
              ? error.message
              : 'Error inesperado al inicializar la base de datos.',
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        setIsConnected(state.isConnected ?? false);
      }),
    [setIsConnected],
  );

  useEffect(() => {
    if (!isDatabaseReady) {
      return;
    }

    void getLecturasPendientes()
      .then((lecturasPendientes) => {
        setPendingCount(lecturasPendientes.length);
      })
      .catch((error: unknown) => {
        console.error('No se pudo actualizar el contador de lecturas pendientes:', error);
      });
  }, [isDatabaseReady, setPendingCount, syncRequestId]);

  useEffect(() => {
    if (!isDatabaseReady || !isConnected) {
      return;
    }

    if (isSyncing.current) {
      syncAgain.current = true;
      return;
    }

    isSyncing.current = true;

    void (async () => {
      try {
        await syncPendingReadings(setPendingCount);
      } catch (error) {
        console.error('No se pudieron sincronizar las lecturas pendientes:', error);
      } finally {
        isSyncing.current = false;
        const shouldSyncAgain = syncAgain.current;
        syncAgain.current = false;
        if (shouldSyncAgain && useSyncStore.getState().isConnected) {
          requestSync();
        }
      }
    })();
  }, [isConnected, isDatabaseReady, requestSync, setPendingCount, syncRequestId]);

  if (databaseError) {
    return (
      <LinearGradient
        colors={['#0A2540', '#134E6F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text accessibilityRole="alert" style={styles.statusText}>
          No se pudo inicializar la base de datos: {databaseError}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  if (!isDatabaseReady) {
    return (
      <LinearGradient
        colors={['#0A2540', '#134E6F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.brandMark}>
          <View style={styles.brandMarkLine} />
          <View style={styles.brandMarkLineShort} />
        </View>
        <Text style={styles.loadingTitle}>EPMAPS</Text>
        <Text style={styles.loadingText}>Cargando...</Text>
      </LinearGradient>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#092A50' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { color: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  brandMark: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(0,210,211,0.78)',
  },
  brandMarkLine: {
    width: 23,
    height: 4,
    marginBottom: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  brandMarkLineShort: {
    width: 15,
    height: 4,
    marginLeft: -8,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 2,
  },
  loadingText: {
    marginTop: 7,
    color: '#BFD9E5',
    fontSize: 13,
  },
  statusCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  statusDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    marginRight: 10,
    borderRadius: 4,
    backgroundColor: '#F9A8A8',
  },
  statusText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
  },
});