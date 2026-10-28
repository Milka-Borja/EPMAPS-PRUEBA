# ADR-007: Detectar conectividad con NetInfo y sincronizar lecturas secuencialmente
## Estado
Aceptado.
## Fecha
2026-10-26
## Requisitos relacionados
R9 (detectar conectividad y enviar pendientes silenciosamente) y R10 (marcar cada lectura enviada y evitar reenvíos locales normales).
## Contexto
En Nono, Pacto y Calacalí la cobertura puede interrumpirse mientras se procesa una cola de lecturas. Una caída parcial no debe impedir que las lecturas restantes se conserven, y el teléfono debe indicar cuántos registros siguen pendientes. Los servicios externos tienen límites y las fotos pueden requerir una transferencia antes del envío de cada lectura.
## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| Enviar toda la cola mediante `Promise.all` | Reduce la latencia total cuando todos los endpoints y archivos responden rápidamente. | Dispara varias peticiones y posibles cargas de fotos simultáneas; consume más memoria/ancho de banda, puede sobrecargar un servicio simulado y dificulta reintentar cada registro con fallos parciales. |
| Polling periódico de conectividad y cola | Puede programar revisiones periódicas aun si no se recibe una transición de estado en el instante esperado. | Genera trabajo y consultas redundantes con batería y red limitadas, y no reemplaza la señal inmediata del sistema operativo. |
| Listener NetInfo más bucle secuencial | Reacciona a cambios reportados por el sistema y limita a una lectura/foto en progreso; cada registro puede actualizarse localmente al completar su petición. | NetInfo informa conectividad del dispositivo, no garantiza que MockAPI o Cloudinary estén disponibles; el proceso queda condicionado a permisos, configuración y respuesta de cada servicio. |
## Decisión
Usar `@react-native-community/netinfo` con un listener global y ejecutar una cola secuencial `for...of` cuando la base esté inicializada y el estado de conexión sea positivo. Para cada registro pendiente, completar primero la carga de foto local cuando exista, persistir su URL, enviar el POST y marcar inmediatamente esa lectura como `ENVIADO`. Los errores individuales se registran y permiten continuar con la siguiente lectura; el contador pendiente se vuelve a consultar al finalizar.
## Consecuencias
Las cargas se limitan a una por vez, se reduce la presión sobre conexiones móviles y el avance de una lectura queda guardado antes de pasar a la siguiente. La sincronización no bloquea la interfaz con una confirmación por cada registro. Riesgo técnico importante: el POST remoto y la actualización SQLite no forman una transacción distribuida. Si el servidor acepta el POST y la app se cierra antes de `markAsSent`, el siguiente intento puede duplicar la lectura; la restricción local de R10 evita duplicados creados en el teléfono, pero no garantiza idempotencia remota. Además, un `isConnected` verdadero no asegura alcance del host ni que la conexión a Internet sea utilizable.
## Verificación
Implementación en [app/_layout.tsx](../../app/_layout.tsx) (listener, guardas de sincronización, iteración secuencial y captura de errores), [src/store/syncStore.ts](../../src/store/syncStore.ts) (estado de red/contador/solicitud) y [src/database/sqlite.ts](../../src/database/sqlite.ts) (consultas y transición a `ENVIADO`). En un teléfono: guardar varias lecturas sin cobertura, restaurar la conexión y comprobar que se procesan una por una y disminuye el contador; simular un fallo de Cloudinary o MockAPI y comprobar que el registro fallido sigue pendiente mientras los siguientes se intentan; repetir una transición de red y comprobar que no hay dos procesos locales concurrentes. No se encontró prueba automatizada de la cola ni una clave idempotente en el API.
## Uso de IA
Consulta de esta tarea: comparar envío concurrente, polling y una cola secuencial basada en eventos de red para una app de campo. La IA sugirió una cola secuencial para reducir presión y aislar fallos por registro. Se acepta porque `app/_layout.tsx` ya limita la concurrencia y actualiza cada fila tras la respuesta; se descarta describir el flujo como “atómico” entre SQLite y el servidor, ya que el código no puede garantizar esa atomicidad ni idempotencia remota.
