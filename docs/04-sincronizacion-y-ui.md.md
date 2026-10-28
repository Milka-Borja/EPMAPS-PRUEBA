# Módulo: Sincronización Automática y Diseño UI
**Objetivo:** Cumplir R9 (envío silencioso) y evitar la sanción de -5 puntos por diseño genérico.

**Dependencias:** `@react-native-community/netinfo` (Justificación R9).

**Lógica de Sincronización (App Layout - R9):**
1. Configurar un listener global de NetInfo en `_layout.tsx`.
2. Actualizar `syncStore.isConnected`.
3. Efecto (useEffect): Cuando `isConnected` pase a `true`, ejecutar función `syncPendingReadings()`.
4. `syncPendingReadings()`:
   - Leer de SQLite registros con 'PENDIENTE'.
   - Recorrerlos uno a uno (no en bloque).
   - Si `foto_uri` comienza con `file://`, subir la foto a Cloudinary y guardar su `secure_url` en SQLite antes de continuar. Si la subida falla, no enviar esa lectura y continuar con las demás.
   - Hacer POST a MockAPI (`/lecturas`).
   - Si MockAPI responde OK (200/201), actualizar `estado_sync` a 'ENVIADO' en SQLite *inmediatamente*. (Esto evita duplicados si la red cae a la mitad R9).

**Reglas de Diseño UI (Anti-sanción):**
1. **NO usar componentes base de React Native sin estilar.**
2. Crear un componente `<EpmapsButton />` con color corporativo EPMAPS (Azul obscuro/Celeste), bordes redondeados (`borderRadius: 8`), y feedback visual (`Pressable` con opacidad).
3. Crear un componente `<NetworkBadge />` que se coloque en el header del layout principal:
   - Si hay red: Punto verde + texto "Conectado | Pendientes: X" (R9).
   - Si no hay red: Punto rojo + texto "Modo Offline | Pendientes: X" (R9).
4. Usar márgenes amplios (`padding: 16`), tipografía legible y sombras (`elevation: 2`) en las tarjetas de información del medidor.