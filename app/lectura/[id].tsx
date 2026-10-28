import { useEffect, useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getLecturaById,
  getMedidorCache,
  saveLectura,
  updateLectura,
  type LecturaLocal,
  type MedidorCache,
} from '../../src/database/sqlite';
import { useDraftStore } from '../../src/store/draftStore';
import { useSyncStore } from '../../src/store/syncStore';

const METER_CODE_PATTERN = /^MED-\d{6}$/;
const CAMERA_PERMISSION_MESSAGE =
  'Se requiere la cámara para respaldar consumos anómalos o daños. Puede continuar sin foto en registros normales.';

type EstadoMedidor = 'NORMAL' | 'INACCESIBLE' | 'DAÑADO';

interface LecturaForm {
  estado: EstadoMedidor;
  lectura: string;
  motivo: string;
  descripcionDano: string;
}

const ESTADOS: { value: EstadoMedidor; label: string; caption: string }[] = [
  { value: 'NORMAL', label: 'Normal', caption: 'Lectura disponible' },
  {
    value: 'INACCESIBLE',
    label: 'Inaccesible',
    caption: 'No se pudo acceder',
  },
  { value: 'DAÑADO', label: 'Dañado', caption: 'Requiere descripción y foto' },
];

function parseReading(value: string): number {
  return Number(value.trim().replace(',', '.'));
}

function formText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isEstadoMedidor(value: unknown): value is EstadoMedidor {
  return value === 'NORMAL' || value === 'INACCESIBLE' || value === 'DAÑADO';
}

export default function LecturaScreen() {
  const { id, lecturaId } = useLocalSearchParams<{
    id?: string;
    lecturaId?: string;
  }>();
  const codigo = typeof id === 'string' ? id : '';
  const editId =
    typeof lecturaId === 'string' && /^\d+$/.test(lecturaId)
      ? Number(lecturaId)
      : null;
  const hasEditParam = lecturaId !== undefined;
  const [medidor, setMedidor] = useState<MedidorCache | null>(null);
  const [lecturaExistente, setLecturaExistente] =
    useState<LecturaLocal | null>(null);
  const [isLoadingMeter, setIsLoadingMeter] = useState(true);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [draftResolved, setDraftResolved] = useState(false);
  const [hasEditedDraft, setHasEditedDraft] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [anomalyAcknowledged, setAnomalyAcknowledged] = useState(false);
  const [anomalyReading, setAnomalyReading] = useState('');
  const [focusedField, setFocusedField] = useState<
    'reading' | 'reason' | 'damage' | null
  >(null);
  const cameraRef = useRef<CameraView>(null);
  const backgroundRef = useRef<View | null>(null);
  const anomalyAlertVisible = useRef(false);
  const lastAnomalyAlert = useRef('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const isValidCode = METER_CODE_PATTERN.test(codigo);
  const visibleScreenError = isValidCode
    ? hasEditParam && editId === null
      ? 'El identificador de la lectura no es válido.'
      : screenError
    : 'El código del medidor no tiene un formato válido.';
  const saveDraft = useDraftStore((state) => state.saveDraft);
  const clearDraft = useDraftStore((state) => state.clearDraft);
  const requestSync = useSyncStore((state) => state.requestSync);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LecturaForm>({
    shouldUnregister: true,
    defaultValues: {
      estado: 'NORMAL',
      lectura: '',
      motivo: '',
      descripcionDano: '',
    },
  });
  const formValues = useWatch({ control });
  const estado = formValues.estado ?? 'NORMAL';
  const lecturaActual = formValues.lectura ?? '';
  const fotoObligatoria = estado === 'DAÑADO' || anomalyAcknowledged;

  useEffect(() => {
    let isMounted = true;

    if (hasEditParam && editId === null) {
      return () => {
        isMounted = false;
      };
    }

    if (!isValidCode) {
      return () => {
        isMounted = false;
      };
    }

    if (editId !== null) {
      Promise.all([getMedidorCache(codigo), getLecturaById(editId)])
        .then(([meterResult, readingResult]) => {
          if (!isMounted) {
            return;
          }

          if (!readingResult || readingResult.codigo_medidor !== codigo) {
            setScreenError('No se encontró la lectura solicitada.');
            return;
          }

          if (readingResult.estado_sync !== 'PENDIENTE') {
            setScreenError('La lectura ya fue enviada y no se puede corregir.');
            return;
          }

          if (!isEstadoMedidor(readingResult.estado_medidor)) {
            setScreenError(
              'El estado guardado de esta lectura no es válido y no se puede editar.',
            );
            return;
          }

          if (!meterResult) {
            setScreenError(
              'No se encontró información del medidor en la caché. Vuelve a buscar el medidor antes de editar la lectura.',
            );
            return;
          }

          setMedidor(meterResult);
          setLecturaExistente(readingResult);
          reset({
            estado: readingResult.estado_medidor,
            lectura:
              readingResult.lectura_actual === null
                ? ''
                : String(readingResult.lectura_actual),
            motivo: readingResult.motivo_inaccesible ?? '',
            descripcionDano: readingResult.descripcion_dano ?? '',
          });
          setPhotoUri(readingResult.foto_uri);
          setDraftResolved(true);
        })
        .catch((error: unknown) => {
          if (isMounted) {
            setScreenError(
              error instanceof Error
                ? error.message
                : 'No se pudo cargar la lectura para editar.',
            );
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingMeter(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }

    getMedidorCache(codigo)
      .then((result) => {
        if (isMounted) {
          setMedidor(result);
          if (!result) {
            setScreenError(
              'No se encontró información del medidor en la caché. Vuelve a buscar el medidor antes de registrar una lectura.',
            );
          }
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setScreenError(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar la información del medidor.',
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingMeter(false);
        }
      });

    const resolveDraft = () => {
      if (!isMounted) {
        return;
      }

      const currentDraft = useDraftStore.getState();
      const draft = currentDraft.draftData;

      if (
        currentDraft.isDraftActive &&
        draft.codigo_medidor === codigo
      ) {
        Alert.alert(
          'Borrador encontrado',
          `Hay una lectura sin terminar para ${codigo}. ¿Deseas continuar o descartarla?`,
          [
            {
              text: 'Descartar',
              style: 'destructive',
              onPress: () => {
                clearDraft();
                setHasEditedDraft(false);
                setDraftResolved(true);
              },
            },
            {
              text: 'Continuar',
              onPress: () => {
                const draftState = isEstadoMedidor(draft.estado)
                  ? draft.estado
                  : 'NORMAL';
                reset({
                  estado: draftState,
                  lectura: formText(draft.lectura),
                  motivo: formText(draft.motivo),
                  descripcionDano: formText(draft.descripcionDano),
                });
                setPhotoUri(formText(draft.foto_uri) || null);
                setAnomalyAcknowledged(draft.anomaly_acknowledged === true);
                setAnomalyReading(formText(draft.anomaly_reading));
                setHasEditedDraft(true);
                setDraftResolved(true);
              },
            },
          ],
          { cancelable: false },
        );
        return;
      }

      setDraftResolved(true);
    };

    let unsubscribeHydration: (() => void) | undefined;
    if (useDraftStore.persist.hasHydrated()) {
      resolveDraft();
    } else {
      unsubscribeHydration =
        useDraftStore.persist.onFinishHydration(resolveDraft);
    }

    return () => {
      isMounted = false;
      unsubscribeHydration?.();
    };
  }, [clearDraft, codigo, editId, hasEditParam, isValidCode, reset]);

  useEffect(() => {
    if (editId !== null || !draftResolved || !hasEditedDraft || !codigo) {
      return;
    }

    saveDraft({
      codigo_medidor: codigo,
      estado,
      lectura: lecturaActual,
      motivo: formValues.motivo ?? '',
      descripcionDano: formValues.descripcionDano ?? '',
      foto_uri: photoUri ?? '',
      anomaly_acknowledged: anomalyAcknowledged,
      anomaly_reading: anomalyReading,
    });
  }, [
    anomalyAcknowledged,
    anomalyReading,
    codigo,
    draftResolved,
    editId,
    estado,
    formValues.descripcionDano,
    formValues.motivo,
    hasEditedDraft,
    lecturaActual,
    photoUri,
    saveDraft,
  ]);

  function confirmAnomalousConsumption(reading: number) {
    const readingKey = String(reading);
    anomalyAlertVisible.current = false;
    setAnomalyAcknowledged(true);
    setAnomalyReading(readingKey);
    setHasEditedDraft(true);
  }

  function checkAnomalousConsumption(value: string) {
    if (!medidor || estado === 'INACCESIBLE' || !value.trim()) {
      return;
    }

    const reading = parseReading(value);
    if (!Number.isFinite(reading)) {
      return;
    }

    const consumption = reading - medidor.ultima_lectura;
    if (consumption <= 3 * medidor.consumo_promedio) {
      setAnomalyAcknowledged(false);
      setAnomalyReading('');
      lastAnomalyAlert.current = '';
      return;
    }

    const readingKey = String(reading);
    if (
      anomalyAlertVisible.current ||
      (lastAnomalyAlert.current === readingKey &&
        anomalyAcknowledged &&
        anomalyReading === readingKey)
    ) {
      return;
    }

    lastAnomalyAlert.current = readingKey;
    anomalyAlertVisible.current = true;
    Alert.alert(
      'Consumo inusualmente alto',
      `El consumo calculado es ${consumption.toFixed(2)}, más de tres veces el promedio de ${medidor.consumo_promedio.toFixed(2)}. Para continuar, debes adjuntar una foto del medidor.`,
      [
        {
          text: 'Corregir lectura',
          style: 'cancel',
          onPress: () => {
            anomalyAlertVisible.current = false;
            setValue('lectura', '', { shouldValidate: true });
            setAnomalyAcknowledged(false);
            setAnomalyReading('');
            lastAnomalyAlert.current = '';
            setHasEditedDraft(true);
          },
        },
        {
          text: 'Continuar',
          onPress: () => confirmAnomalousConsumption(reading),
        },
      ],
      { cancelable: false },
    );
  }

  async function openCamera() {
    setPhotoError(null);
    try {
      if (!cameraPermission?.granted) {
        const permission = await requestCameraPermission();
        if (!permission.granted) {
          Alert.alert('Permiso de cámara', CAMERA_PERMISSION_MESSAGE);
          setPhotoError(
            fotoObligatoria
              ? 'La foto es obligatoria para este registro. Concede el permiso para poder continuar.'
              : null,
          );
          return;
        }
      }
      setCameraVisible(true);
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : 'No se pudo solicitar el permiso de cámara.',
      );
      Alert.alert('Permiso de cámara', CAMERA_PERMISSION_MESSAGE);
    }
  }

  async function capturePhoto() {
    if (!cameraRef.current || isCapturing) {
      return;
    }

    setIsCapturing(true);
    setPhotoError(null);
    try {
      const captured = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (!captured?.uri) {
        throw new Error('La cámara no devolvió una imagen válida.');
      }

      const savedPhoto = new File(
        Paths.document,
        `${codigo}-${Date.now()}.jpg`,
      );
      new File(captured.uri).copy(savedPhoto);
      setPhotoUri(savedPhoto.uri);
      setHasEditedDraft(true);
      setCameraVisible(false);
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la foto en el dispositivo.',
      );
    } finally {
      setIsCapturing(false);
    }
  }

  function changeEstado(value: EstadoMedidor) {
    setValue('estado', value, { shouldValidate: true });
    if (value === 'INACCESIBLE') {
      setValue('lectura', '', { shouldValidate: true });
    }
    if (value !== 'INACCESIBLE') {
      setValue('motivo', '', { shouldValidate: true });
    }
    if (value !== 'DAÑADO') {
      setValue('descripcionDano', '', { shouldValidate: true });
    }
    if (value !== 'NORMAL') {
      setAnomalyAcknowledged(false);
      setAnomalyReading('');
      lastAnomalyAlert.current = '';
    }
    setHasEditedDraft(true);
  }

  const onSubmit = async (values: LecturaForm) => {
    if (!medidor || isSaving) {
      return;
    }

    if (values.estado !== 'INACCESIBLE' && values.lectura.trim()) {
      const reading = parseReading(values.lectura);
      const consumption = reading - medidor.ultima_lectura;
      if (consumption > 3 * medidor.consumo_promedio) {
        const readingKey = String(reading);
        if (
          !anomalyAcknowledged ||
          anomalyReading !== readingKey
        ) {
          checkAnomalousConsumption(values.lectura);
          return;
        }
      }
    }

    const requiresPhoto =
      values.estado === 'DAÑADO' || anomalyAcknowledged;
    if (requiresPhoto && !photoUri) {
      setPhotoError(
        'Adjunta una foto del medidor antes de guardar esta lectura.',
      );
      return;
    }

    setIsSaving(true);
    setScreenError(null);
    try {
      const reading =
        values.estado === 'INACCESIBLE' || !values.lectura.trim()
          ? null
          : parseReading(values.lectura);
      const now = new Date();
      const mesAnio = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`;

      const datosLectura = {
        codigo_medidor: codigo,
        estado_medidor: values.estado,
        lectura_actual: reading,
        motivo_inaccesible:
          values.estado === 'INACCESIBLE' ? values.motivo.trim() : null,
        descripcion_dano:
          values.estado === 'DAÑADO' ? values.descripcionDano.trim() : null,
        foto_uri: photoUri,
        mes_anio: mesAnio,
      };

      if (editId !== null) {
        if (!lecturaExistente) {
          throw new Error('No se pudo cargar la lectura que deseas editar.');
        }

        await updateLectura(editId, {
          ...datosLectura,
          mes_anio: lecturaExistente.mes_anio,
        });
      } else {
        await saveLectura(datosLectura);
        clearDraft();
      }

      requestSync();
      router.back();
    } catch (error) {
      setScreenError(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar la lectura.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <Stack.Screen options={{ title: 'Registrar Lectura' }} />
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
        <LinearGradient
          colors={['#081B3A', '#0D4FA1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View pointerEvents="none" style={styles.heroGlow} />
          <View pointerEvents="none" style={styles.heroOrbit} />
          <Text style={styles.eyebrow}>CAPTURA DE SERVICIO</Text>
          <Text style={styles.title}>
            {editId === null ? 'Registrar lectura' : 'Editar lectura'}
          </Text>
          <Text style={styles.description}>
            {editId === null
              ? 'Verifica el estado del medidor y registra la información de esta visita.'
              : 'Actualiza la información de esta lectura pendiente.'}
          </Text>
        </LinearGradient>

        <View style={styles.meterCard}>
          <BlurView
            blurMethod="dimezisBlurView"
            blurTarget={backgroundRef}
            intensity={95}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            tint="light"
          />
          <View style={styles.meterHeader}>
            <View>
              <Text style={styles.cardEyebrow}>MEDIDOR</Text>
              <Text style={styles.meterCode}>{codigo || 'Sin código'}</Text>
            </View>
            {medidor && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>EN CACHÉ</Text>
              </View>
            )}
          </View>
          {isLoadingMeter && isValidCode ? (
            <Text style={styles.mutedText}>Cargando información...</Text>
          ) : medidor ? (
            <>
              <Text style={styles.meterAddress}>{medidor.direccion}</Text>
              <View style={styles.meterStats}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Última lectura</Text>
                  <Text style={styles.statValue}>
                    {medidor.ultima_lectura}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Promedio</Text>
                  <Text style={styles.statValue}>
                    {medidor.consumo_promedio}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.mutedText}>
              No hay datos disponibles para este medidor.
            </Text>
          )}
        </View>

        {!!visibleScreenError && (
          <View style={styles.errorPanel}>
            <Text accessibilityRole="alert" style={styles.errorText}>
              {visibleScreenError}
            </Text>
          </View>
        )}

        {medidor && (
          <View style={styles.formCard}>
            <BlurView
              blurMethod="dimezisBlurView"
              blurTarget={backgroundRef}
              intensity={95}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              tint="light"
            />
            <Text style={styles.sectionTitle}>Estado del medidor</Text>
            <Text style={styles.sectionHint}>
              Selecciona la condición observada durante la visita.
            </Text>
            <View style={styles.stateOptions}>
              {ESTADOS.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: estado === option.value }}
                  onPress={() => changeEstado(option.value)}
                  style={[
                    styles.stateOption,
                    estado === option.value && styles.stateOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.stateLabel,
                      estado === option.value && styles.stateLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.stateCaption,
                      estado === option.value && styles.stateCaptionSelected,
                    ]}
                  >
                    {option.caption}
                  </Text>
                </Pressable>
              ))}
            </View>

            {estado !== 'INACCESIBLE' ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Lectura actual {estado === 'DAÑADO' ? '(opcional)' : '*'}
                </Text>
                <Controller
                  control={control}
                  name="lectura"
                  rules={{
                    validate: (value) => {
                      if (estado === 'NORMAL' && !value.trim()) {
                        return 'La lectura es obligatoria para un medidor normal.';
                      }
                      if (value.trim()) {
                        const reading = parseReading(value);
                        if (!Number.isFinite(reading) || reading < 0) {
                          return 'Ingresa una lectura numérica válida.';
                        }
                      }
                      return true;
                    },
                  }}
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextInput
                      accessibilityLabel="Lectura actual"
                      editable={!isSaving}
                      keyboardType="decimal-pad"
                      onBlur={() => {
                        onBlur();
                        setFocusedField(null);
                        checkAnomalousConsumption(value);
                      }}
                      onChangeText={(text) => {
                        onChange(text);
                        setHasEditedDraft(true);
                        setPhotoError(null);
                        const parsed = parseReading(text);
                        if (
                          !Number.isFinite(parsed) ||
                          String(parsed) !== anomalyReading
                        ) {
                          setAnomalyAcknowledged(false);
                        }
                      }}
                      onFocus={() => setFocusedField('reading')}
                      placeholder="Ej. 1250.50"
                      placeholderTextColor="#657D8E"
                      style={[
                        styles.input,
                        focusedField === 'reading' && styles.inputFocused,
                        errors.lectura && styles.inputInvalid,
                      ]}
                      value={value}
                    />
                  )}
                />
                {!!errors.lectura?.message && (
                  <Text accessibilityRole="alert" style={styles.fieldError}>
                    {errors.lectura.message}
                  </Text>
                )}
                {estado === 'NORMAL' && (
                  <Text style={styles.fieldHint}>
                    La lectura debe ser mayor o igual a cero.
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.lockedNotice}>
                <Text style={styles.lockedTitle}>Lectura bloqueada</Text>
                <Text style={styles.lockedText}>
                  Al marcar el medidor como inaccesible, se guardará sin una
                  lectura numérica.
                </Text>
              </View>
            )}

            {estado === 'INACCESIBLE' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Motivo de inaccesibilidad *</Text>
                <Controller
                  control={control}
                  name="motivo"
                  rules={{
                    validate: (value) =>
                      estado !== 'INACCESIBLE' ||
                      !!value.trim() ||
                      'Describe por qué no fue posible acceder al medidor.',
                  }}
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextInput
                      accessibilityLabel="Motivo de inaccesibilidad"
                      editable={!isSaving}
                      multiline
                      onBlur={() => {
                        onBlur();
                        setFocusedField(null);
                      }}
                      onChangeText={(text) => {
                        onChange(text);
                        setHasEditedDraft(true);
                      }}
                      onFocus={() => setFocusedField('reason')}
                      placeholder="Ej. El medidor está detrás de una puerta cerrada"
                      placeholderTextColor="#657D8E"
                      style={[
                        styles.input,
                        styles.multilineInput,
                        focusedField === 'reason' && styles.inputFocused,
                        errors.motivo && styles.inputInvalid,
                      ]}
                      textAlignVertical="top"
                      value={value}
                    />
                  )}
                />
                {!!errors.motivo?.message && (
                  <Text accessibilityRole="alert" style={styles.fieldError}>
                    {errors.motivo.message}
                  </Text>
                )}
              </View>
            )}

            {estado === 'DAÑADO' && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Descripción del daño *</Text>
                <Controller
                  control={control}
                  name="descripcionDano"
                  rules={{
                    validate: (value) =>
                      estado !== 'DAÑADO' ||
                      !!value.trim() ||
                      'Describe el daño observado en el medidor.',
                  }}
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextInput
                      accessibilityLabel="Descripción del daño"
                      editable={!isSaving}
                      multiline
                      onBlur={() => {
                        onBlur();
                        setFocusedField(null);
                      }}
                      onChangeText={(text) => {
                        onChange(text);
                        setHasEditedDraft(true);
                      }}
                      onFocus={() => setFocusedField('damage')}
                      placeholder="Describe el daño observado"
                      placeholderTextColor="#657D8E"
                      style={[
                        styles.input,
                        styles.multilineInput,
                        focusedField === 'damage' && styles.inputFocused,
                        errors.descripcionDano && styles.inputInvalid,
                      ]}
                      textAlignVertical="top"
                      value={value}
                    />
                  )}
                />
                {!!errors.descripcionDano?.message && (
                  <Text accessibilityRole="alert" style={styles.fieldError}>
                    {errors.descripcionDano.message}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.photoSection}>
              <View style={styles.photoHeading}>
                <Text style={styles.fieldLabel}>
                  Foto del medidor {fotoObligatoria ? '*' : '(opcional)'}
                </Text>
                {fotoObligatoria && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>OBLIGATORIA</Text>
                  </View>
                )}
              </View>
              {anomalyAcknowledged && (
                <View style={styles.anomalyNotice}>
                  <Text style={styles.anomalyText}>
                    Consumo alto confirmado. Se requiere una foto antes de
                    guardar.
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={() => void openCamera()}
                style={({ pressed }) => [
                  styles.cameraButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <View style={styles.cameraButtonIcon}>
                  <Ionicons color="#102A43" name="camera-outline" size={20} />
                </View>
                <View style={styles.cameraButtonCopy}>
                  <Text style={styles.cameraButtonTitle}>Tomar fotografía</Text>
                  <Text style={styles.cameraButtonHint}>
                    {fotoObligatoria
                      ? 'Requerida para guardar este registro'
                      : 'Añade evidencia visual si es necesario'}
                  </Text>
                </View>
              </Pressable>
              {photoUri && (
                <View style={styles.photoPreview}>
                  <Image
                    accessibilityLabel="Foto del medidor capturada"
                    source={{ uri: photoUri }}
                    style={styles.previewImage}
                  />
                  <View style={styles.photoActions}>
                    <Text style={styles.photoSaved}>Foto guardada en el dispositivo</Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isSaving}
                      onPress={() => {
                        setPhotoUri(null);
                        setHasEditedDraft(true);
                      }}
                    >
                      <Text style={styles.removePhoto}>Quitar</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {cameraVisible && (
                <View style={styles.cameraPanel}>
                  <CameraView
                    ref={cameraRef}
                    facing="back"
                    style={styles.cameraPreview}
                  />
                  <View style={styles.cameraControls}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setCameraVisible(false)}
                      style={[styles.cameraControl, styles.cameraCancel]}
                    >
                      <Text style={styles.cameraControlText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isCapturing}
                      onPress={() => void capturePhoto()}
                      style={[styles.cameraControl, styles.cameraCapture]}
                    >
                      <Text style={styles.cameraControlText}>
                        {isCapturing ? 'Guardando...' : 'Capturar'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
              {!!photoError && (
                <Text accessibilityRole="alert" style={styles.fieldError}>
                  {photoError}
                </Text>
              )}
              {!cameraPermission?.granted && (
                <Text style={styles.fieldHint}>{CAMERA_PERMISSION_MESSAGE}</Text>
              )}
            </View>
          </View>
        )}

        {medidor && (
          <Pressable
            accessibilityRole="button"
            disabled={isSaving || isLoadingMeter}
            onPress={() => void handleSubmit(onSubmit)()}
            style={({ pressed }) => [
              styles.saveButton,
              (isSaving || isLoadingMeter) && styles.saveButtonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={
                isSaving || isLoadingMeter
                  ? ['#77909E', '#6B8290']
                  : ['#087EA4', '#075985']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>
                {isSaving
                  ? editId === null
                    ? 'Guardando lectura...'
                    : 'Guardando cambios...'
                  : editId === null
                    ? 'Guardar lectura'
                    : 'Guardar cambios'}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  hero: {
    marginBottom: 18,
    overflow: 'hidden',
    padding: 23,
    borderRadius: 26,
  },
  heroGlow: {
    position: 'absolute',
    right: -24,
    top: -34,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0,210,211,0.12)',
  },
  heroOrbit: {
    position: 'absolute',
    right: 12,
    top: 24,
    width: 78,
    height: 78,
    borderWidth: 1,
    borderColor: 'rgba(164,245,245,0.2)',
    borderRadius: 39,
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
    fontSize: 27,
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
  meterCard: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
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
  meterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    fontSize: 21,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(8,127,131,0.24)',
    backgroundColor: 'rgba(8,127,131,0.1)',
  },
  statusPillText: {
    color: '#087F83',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  meterAddress: {
    marginBottom: 14,
    color: '#102A43',
    fontSize: 14,
  },
  meterStats: {
    flexDirection: 'row',
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: 'rgba(83,107,125,0.2)',
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    marginBottom: 4,
    color: '#334E68',
    fontSize: 12,
  },
  statValue: {
    color: '#102A43',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  mutedText: {
    color: '#334E68',
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    position: 'relative',
    overflow: 'hidden',
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
  sectionTitle: {
    color: '#102A43',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: {
    marginTop: 5,
    marginBottom: 14,
    color: '#334E68',
    fontSize: 13,
    lineHeight: 18,
  },
  stateOptions: {
    marginBottom: 20,
    gap: 8,
  },
  stateOption: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D5DDE3',
    borderRadius: 12,
    backgroundColor: '#E4E9ED',
  },
  stateOptionSelected: {
    borderColor: '#9AAAB5',
    backgroundColor: '#D7E0E6',
  },
  stateLabel: {
    color: '#102A43',
    fontSize: 14,
    fontWeight: '700',
  },
  stateLabelSelected: {
    color: '#102A43',
  },
  stateCaption: {
    marginTop: 2,
    color: '#334E68',
    fontSize: 11,
  },
  stateCaptionSelected: {
    color: '#102A43',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    marginBottom: 8,
    color: '#102A43',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D5DDE3',
    borderRadius: 15,
    backgroundColor: '#E4E9ED',
    color: '#102A43',
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
  inputInvalid: {
    borderColor: '#C4473A',
  },
  multilineInput: {
    minHeight: 96,
  },
  fieldError: {
    marginTop: 7,
    color: '#9B2C23',
    fontSize: 12,
    lineHeight: 18,
  },
  fieldHint: {
    marginTop: 7,
    color: '#334E68',
    fontSize: 12,
    lineHeight: 18,
  },
  lockedNotice: {
    marginBottom: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D5DDE3',
    borderRadius: 15,
    backgroundColor: '#E4E9ED',
  },
  lockedTitle: {
    marginBottom: 4,
    color: '#102A43',
    fontSize: 13,
    fontWeight: '700',
  },
  lockedText: {
    color: '#334E68',
    fontSize: 12,
    lineHeight: 18,
  },
  photoSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(83,107,125,0.2)',
  },
  photoHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(200,50,62,0.12)',
  },
  requiredBadgeText: {
    color: '#9B2C23',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  anomalyNotice: {
    marginBottom: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: 'rgba(200,50,62,0.3)',
    borderRadius: 10,
    backgroundColor: 'rgba(200,50,62,0.1)',
  },
  anomalyText: {
    color: '#9B2C23',
    fontSize: 12,
    lineHeight: 18,
  },
  cameraButton: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C8D2DA',
    borderRadius: 12,
    backgroundColor: '#E4E9ED',
  },
  cameraButtonIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderRadius: 19,
    backgroundColor: '#C6D0D7',
  },
  cameraButtonCopy: {
    flex: 1,
  },
  cameraButtonTitle: {
    color: '#102A43',
    fontSize: 14,
    fontWeight: '700',
  },
  cameraButtonHint: {
    marginTop: 3,
    color: '#334E68',
    fontSize: 11,
  },
  photoPreview: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C8D2DA',
    borderRadius: 12,
    backgroundColor: '#E4E9ED',
  },
  previewImage: {
    width: 200,
    height: 190,
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#E8EEF1',
  },
  photoActions: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  photoSaved: {
    flex: 1,
    marginRight: 8,
    color: '#334E68',
    fontSize: 11,
    fontWeight: '600',
  },
  removePhoto: {
    padding: 8,
    color: '#087EA4',
    fontSize: 12,
    fontWeight: '700',
  },
  cameraPanel: {
    overflow: 'hidden',
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#0A2540',
  },
  cameraPreview: {
    height: 250,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  cameraControl: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  cameraCancel: {
    backgroundColor: '#31556A',
  },
  cameraCapture: {
    backgroundColor: '#0EA5A4',
  },
  cameraControlText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  errorPanel: {
    marginBottom: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0C6C2',
    borderRadius: 12,
    backgroundColor: '#FFF4F2',
  },
  errorText: {
    color: '#A52A20',
    fontSize: 13,
    lineHeight: 19,
  },
  saveButton: {
    minHeight: 54,
    overflow: 'hidden',
    marginTop: 16,
    borderRadius: 16,
    shadowColor: '#087EA4',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 3,
  },
  saveButtonGradient: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
