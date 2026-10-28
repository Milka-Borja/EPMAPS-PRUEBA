# Módulo: Base de Datos Local (SQLite)
**Objetivo:** Permitir el funcionamiento offline-first para cumplir con los requisitos de caché (R3), persistencia en modo avión (R4) y evitar envíos duplicados (R10).

**Dependencia obligatoria:** `expo-sqlite` (Justificación: Almacenamiento relacional estructurado para medidores y lecturas offline).

**Estructura requerida:**
1. Crear base de datos `epmaps.db`.
2. **Tabla `medidores_cache`**: 
   - Campos: `codigo` (TEXT PRIMARY KEY), `direccion` (TEXT), `sector` (TEXT), `numero_cuenta` (TEXT), `estado_actual` (TEXT), `ultima_lectura` (REAL), `fecha_ultima_lectura` (TEXT), `consumo_promedio` (REAL).
   - Lógica: Al buscar un medidor con red, insertar/actualizar aquí. En modo avión, leer de aquí. (R3)
3. **Tabla `lecturas_locales`**:
   - Campos: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `codigo_medidor` (TEXT), `estado_medidor` (TEXT), `lectura_actual` (REAL NULL), `motivo_inaccesible` (TEXT NULL), `descripcion_dano` (TEXT NULL), `foto_uri` (TEXT NULL - Ruta del FileSystem), `estado_sync` (TEXT - Valores: 'PENDIENTE', 'ENVIADO'), `mes_anio` (TEXT - Formato 'YYYY-MM').
   - Lógica: Todo registro se guarda primero como 'PENDIENTE' (R4).
4. **Funciones CRUD a exportar:**
   - `initDB()`: Crea las tablas si no existen.
   - `saveMedidorCache(medidor)` y `getMedidorCache(codigo)`.
   - `saveLectura(lectura)`: Validar antes que no exista ya un registro 'ENVIADO' o 'PENDIENTE' para el mismo `codigo_medidor` y `mes_anio` (Bloqueo de duplicados R10).
   - `updateLectura(id, datos)`: Solo permitir si `estado_sync` es 'PENDIENTE' (R10).
   - `getLecturasPendientes()`: Retorna registros donde `estado_sync` = 'PENDIENTE'.
   - `getLecturas()`: Retorna lecturas 'PENDIENTE' y 'ENVIADO' para consultar el historial; las enviadas se muestran como solo lectura (R10).
   - `getLecturaById(id)`: Busca una lectura local por su identificador.
   - `markAsSent(id)`: Cambia `estado_sync` a 'ENVIADO'.