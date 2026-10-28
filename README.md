# EPMAPS App

Aplicación móvil desarrollada con Expo + React Native para la gestión de lecturas de medidores del servicio de agua potable de Quito.

## Descripción

EPMAPS App permite a personal técnico:

- autenticarse con credenciales institucionales,
- buscar medidores por código,
- consultar información del servicio y del historial del medidor,
- registrar lecturas locales para cada periodo,
- adjuntar fotos del medidor,
- mantener registros pendientes cuando hay baja conectividad,
- sincronizar automáticamente las lecturas cuando vuelve la conexión.

La app combina almacenamiento local con SQLite y sincronización con una API mock mediante `fetch`, con soporte para sincronización offline/online.

## Stack tecnológico

- React Native
- Expo SDK 57
- Expo Router
- TypeScript
- SQLite con `expo-sqlite`
- Zustand para estado global
- AsyncStorage para persistencia de sesión y borradores
- NetInfo para detección de conexión
- Cloudinary para carga de fotografías

## Estructura principal

```text
app/
  _layout.tsx
  index.tsx
  (tabs)/
    _layout.tsx
    buscar.tsx
    pendientes.tsx
  lectura/[id].tsx

src/
  api/
    mockapi.ts
  database/
    sqlite.ts
  store/
    authStore.ts
    draftStore.ts
    syncStore.ts
```

## Funcionalidades principales

### 1. Autenticación
La pantalla inicial valida credenciales con un acceso demo:

- Código: `EMP-001`
- Clave: `1234`

La sesión se persiste localmente con Zustand + AsyncStorage.

### 2. Búsqueda de medidores
El usuario puede consultar un medidor por código con formato:

- `MED-123456`

El flujo intenta usar caché local primero y, si no existe, consulta la API remota. Cuando la búsqueda es exitosa, el resultado se guarda en SQLite para uso posterior offline.

### 3. Lecturas locales
Cada lectura se guarda localmente en la base de datos con:

- `codigo_medidor`
- `estado_medidor`
- `lectura_actual`
- `motivo_inaccesible`
- `descripcion_dano`
- `foto_uri`
- `estado_sync`
- `mes_anio`

Además, la app evita duplicados por medidor y periodo, validando el formato del mes (`YYYY-MM`).

### 4. Sincronización
Cuando el dispositivo tiene conexión a internet, la app revisa las lecturas en estado `PENDIENTE` y las envía a la API.

Si una lectura tiene una foto local en `file://`, se sube primero a Cloudinary y luego se actualiza el registro con la URL pública antes del envío.

### 5. Modo offline
La aplicación funciona sin conexión para:

- consultar medidores ya cacheados,
- registrar lecturas locales,
- visualizar historial de lecturas,
- mantener pendientes para sincronizar luego.

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con los siguientes valores:

```env
EXPO_PUBLIC_MOCKAPI_URL=https://tu-api-mock.com
EXPO_PUBLIC_CLOUDINARY_UPLOAD_URL=https://api.cloudinary.com/v1_1/tu-cloud/upload
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=tu_preset
```

### Importante
- `EXPO_PUBLIC_MOCKAPI_URL` es requerido por `src/api/mockapi.ts` para consultar medidores y enviar lecturas.
- `EXPO_PUBLIC_CLOUDINARY_UPLOAD_URL` y `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` son requeridos para subir fotos.

## Instalación

1. Clona el proyecto.
2. Instala las dependencias:

```bash
npm install
```

3. Crea el archivo `.env` con las variables indicadas.

4. Inicia la app:

```bash
npm start
```

O ejecuta directamente en plataformas específicas:

```bash
npm run android
npm run ios
npm run web
```

## Scripts disponibles

```bash
npm start
npm run android
npm run ios
npm run web
npm run lint
```

## Recomendaciones de uso

- Usa la app en un entorno con conexión para la primera sincronización inicial.
- Asegúrate de que `EXPO_PUBLIC_MOCKAPI_URL` apunte a una API compatible con los endpoints esperados por `mockapi.ts`.
- Cuando trabajes con fotos, verifica que el preset de Cloudinary tiene permisos correctos para la carga desde la app.
- Para pruebas de flujo offline, desactiva la conexión del dispositivo o emulador antes de enviar lecturas.

## Notas del proyecto

- El almacenamiento persistente de la sesión y de borradores se maneja con `AsyncStorage`.
- El estado de sincronización se gestiona con Zustand.
- La base de datos local usa dos tablas principales:
  - `medidores_cache`
  - `lecturas_locales`

## Licencia

Este proyecto se distribuye bajo la licencia incluida en el repositorio (`LICENSE`).
