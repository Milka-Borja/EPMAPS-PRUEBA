# ADR-006: Capturar fotos con expo-camera y conservarlas en el dispositivo antes de subirlas
## Estado
Aceptado.
## Fecha
2026-10-26
## Requisitos relacionados
R7 (evidencia fotográfica para daños o lecturas anómalas) y Requisito Opcional (publicar la imagen y adjuntar su URL a la lectura).
## Contexto
Una foto de un medidor dañado o de una lectura inusualmente alta respalda el trabajo realizado. El técnico puede estar sin cobertura al capturarla y debe poder conservar la evidencia al cerrar la app; el envío a un servicio remoto solo puede completarse cuando haya conectividad. La imagen también debe poder asociarse al registro que espera MockAPI.
## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `expo-image-picker` para seleccionar o tomar imágenes | API adecuada para adjuntar imágenes desde la galería y una opción válida si la captura no necesita ocurrir dentro del flujo controlado. | El requisito de evidencia pide captura en el flujo de lectura; la selección de una imagen preexistente puede debilitar la asociación temporal con la inspección y no aporta una ventaja frente al componente de cámara ya instalado. |
| Guardar la imagen codificada en Base64 dentro de SQLite | Mantiene la imagen y el registro en un único almacenamiento local y evita administrar una ruta de archivo separada. | Aumenta mucho el tamaño de la base y el costo de serialización/lectura; penaliza memoria y rendimiento en teléfonos de campo y complica la limpieza de imágenes. |
| `expo-camera` + `expo-file-system` + carga HTTP a Cloudinary | Captura en la pantalla de lectura, conserva el archivo en el almacenamiento de documentos y puede transferirlo después como multipart sin instalar un SDK de Cloudinary. | Requiere mantener URI y estado de sincronización coordinados; una subida fallida deja el registro pendiente y una URL pública implica revisar privacidad, retención y configuración del servicio. |
## Decisión
Capturar la imagen dentro de la pantalla con `expo-camera`, copiarla al directorio persistente de documentos con `expo-file-system` y conservar inicialmente su URI local en SQLite. Si el URI es local, la sincronización intenta subir el archivo a Cloudinary mediante HTTP multipart, persiste la `secure_url` en SQLite y luego envía la lectura a MockAPI. No se incorpora Cloudinary SDK: la operación usa `expo/fetch` y el API HTTP del proveedor.
## Consecuencias
La captura puede completarse sin red y el archivo local sobrevive al reinicio; la sincronización diferida transforma la URI local en URL pública antes de enviar el registro. Las fotos son obligatorias para estados dañados y para consumos anómalos reconocidos, no para todos los casos normales. Como riesgo, el archivo ocupa almacenamiento local hasta una política de eliminación explícita y la subida usa un preset configurado en variables `EXPO_PUBLIC_*`; estas variables se incluyen en el bundle y no deben contener secretos. Un preset público permite potencialmente cargas no autorizadas, por lo que límites, moderación y credenciales de producción requieren un diseño adicional.
## Verificación
Captura y persistencia: [app/lectura/[id].tsx](<../../app/lectura/[id].tsx>); transferencia y asociación de URL: [app/_layout.tsx](../../app/_layout.tsx); configuración de permisos/plugins: [app.json](../../app.json); persistencia de `foto_uri`: [src/database/sqlite.ts](../../src/database/sqlite.ts). En un teléfono con permiso concedido, capturar una foto, cerrar y volver a abrir la app y verificar la imagen en el borrador o lectura. Con red, comprobar que el registro termina con URL; sin red o con carga fallida, comprobar que la lectura sigue pendiente y no se envía sin completar la subida. No se encontró prueba automatizada de cámara o Cloudinary.
## Uso de IA
Consulta de esta tarea: comparar cámara integrada, selector de galería y Base64 para capturar evidencia en una visita con posible falta de red. La IA sugirió mantener un archivo local persistente y posponer la transferencia, evitando guardar binarios en la base. Se acepta porque la implementación conserva una URI en SQLite y la cola actual sube el archivo antes del POST; se descarta Base64 por tamaño y costo, y no se añade SDK de Cloudinary porque la API HTTP ya cubre la operación.
