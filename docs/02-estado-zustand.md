# Módulo: Gestión de Estado Global
**Objetivo:** Manejar la sesión del usuario (R1), la persistencia de formularios a medias (R8) y el estado de la red (R9) en toda la aplicación.

**Dependencias obligatorias:** `zustand`, `@react-native-async-storage/async-storage` (Justificación: Persistencia de stores globales entre reinicios de app).

**Stores a crear:**

1. **`authStore.ts` (Requisito R1)**
   - Estado: `userCode` (string | null), `isAuthenticated` (boolean).
   - Acciones: `login(code, password)`, `logout()`.
   - Regla de persistencia: Usar `persist` middleware. La sesión NO debe expirar al cerrar/abrir la app, solo al llamar a `logout()`. (R1)

2. **`draftStore.ts` (Requisito R8)**
   - Estado: `draftData` (objeto con los campos del formulario actual), `isDraftActive` (boolean).
   - Acciones: `saveDraft(data)`, `clearDraft()`.
   - Regla de persistencia: Usar `persist` middleware. Si la app se cierra (kill) y se vuelve a abrir, la pantalla de lectura debe revisar si `isDraftActive` es true para ofrecer "Continuar" o "Descartar" (R8).

3. **`syncStore.ts` (Requisito R9)**
   - Estado: `isConnected` (boolean), `pendingCount` (number).
   - Acciones: `setIsConnected(boolean)`, `setPendingCount(number)`.
   - Nota: Este store no necesita persistencia, se alimenta de NetInfo y de SQLite en tiempo real. Se usará para mostrar el badge de red en todas las pantallas.