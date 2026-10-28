# Módulo: Reglas de Negocio y Validaciones
**Objetivo:** Implementar la lógica estricta de captura, validación y cálculos.

**Dependencias:** `zod`, `react-hook-form`.

**Reglas estrictas a implementar:**

1. **Búsqueda de Medidor (R2):**
   - Regex de validación: `/^MED-\d{6}$/` (Ej. MED-123456).
   - Restricción: Bloquear el botón de buscar y no disparar fetch ni query a SQLite si el formato no coincide. Mostrar mensaje de error (R2).

2. **Estados del Medidor (R5):**
   - Si estado = `NORMAL`: Campo `lectura` es OBLIGATORIO. Foto = Opcional (a menos que aplique R6).
   - Si estado = `INACCESIBLE`: Campo `motivo` es OBLIGATORIO. `lectura` DEBE bloquearse (null).
   - Si estado = `DAÑADO`: Campo `descripcion_dano` es OBLIGATORIO. `lectura` = Opcional. Foto = OBLIGATORIA. (R5, R7)

3. **Cálculo de Consumo Anómalo (R6 & R7):**
   - Fórmula: `consumo_actual = lectura_ingresada - ultima_lectura_cache`.
   - Disparador: Si `consumo_actual > (3 * consumo_promedio_cache)`.
   - Acción requerida: Mostrar `Alert` advirtiendo consumo alto pidiendo confirmación.
   - Consecuencia R7: Hacer que la foto del medidor pase a ser estrictamente OBLIGATORIA antes de poder guardar (R6, R7).

4. **Reglas de Cámara (R7):**
   - Usar `expo-camera`.
   - Si el técnico rechaza el permiso, mostrar un modal/alerta explicando: "Se requiere la cámara para respaldar consumos anómalos o daños. Puede continuar sin foto en registros normales".
   - Guardar la foto usando `expo-file-system` en `documentDirectory` para que sobreviva a reinicios (R7).