# ADR-001: Persistir caché y lecturas localmente con expo-sqlite
## Estado
Aceptado.
## Fecha
2026-10-26
## Requisitos relacionados
R3 (consulta de datos del medidor en caché), R4 (guardar lecturas sin conexión) y R10 (evitar lecturas duplicadas y conservar el historial).
## Contexto
Los técnicos deben consultar medidores y registrar lecturas en sectores rurales como Nono, Pacto y Calacalí, donde la cobertura móvil puede ser intermitente o inexistente. Una lectura no puede depender de que el teléfono mantenga conexión durante la visita; además, el historial debe distinguir registros pendientes de los ya enviados y evitar dos lecturas del mismo medidor en el mismo periodo.
## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| AsyncStorage para todos los datos | Ya está presente para persistir estado; sencilla para objetos pequeños y no requiere diseñar consultas SQL. | No ofrece restricciones relacionales ni unicidad de forma nativa; habría que leer, modificar y reescribir colecciones completas, con mayor riesgo de duplicados y conflictos al editar el historial. |
| WatermelonDB | Ofrece modelos y consultas reactivas apropiadas para conjuntos locales de datos que crecen y sincronización más elaborada. | Añade una dependencia y complejidad de esquema/sincronización que no se justifican para el volumen acotado de medidores y lecturas de esta prueba; eleva el costo de integración y mantenimiento. |
| expo-sqlite | SQLite permite consultas por código y periodo, clave primaria, restricción `UNIQUE (codigo_medidor, mes_anio)` y operaciones parametrizadas; funciona localmente sin red y ya forma parte del ecosistema Expo usado por la app. | Requiere mantener SQL y gestionar cambios de esquema; el esquema actual crea tablas si no existen, pero no define todavía una estrategia de migraciones. |
## Decisión
Persistir `medidores_cache` y `lecturas_locales` en `epmaps.db` usando `expo-sqlite`. La caché evita una consulta remota repetida cuando existe un medidor local, y las lecturas se insertan como `PENDIENTE`. La restricción única por medidor y periodo, junto con la condición de inserción, impide guardar una segunda lectura local para el mismo periodo. Las lecturas enviadas se conservan para consulta y las actualizaciones solo afectan registros pendientes.
## Consecuencias
La app puede consultar datos previamente almacenados y registrar trabajo sin cobertura; el estado y el historial sobreviven al cierre de la aplicación. El código debe conservar consistentes las funciones CRUD y el formato `YYYY-MM`, y los cambios futuros al esquema necesitarán migraciones explícitas. Se asume el riesgo de que la caché quede obsoleta: al encontrar un medidor en SQLite, la búsqueda actual no fuerza una actualización remota. La base local tampoco está cifrada por esta decisión.
## Verificación
Implementación: [src/database/sqlite.ts](../../src/database/sqlite.ts), inicialización global en [app/_layout.tsx](../../app/_layout.tsx), consulta de caché en [app/(tabs)/buscar.tsx](<../../app/(tabs)/buscar.tsx>) e historial en [app/(tabs)/pendientes.tsx](<../../app/(tabs)/pendientes.tsx>). En un teléfono: buscar un medidor con red, activar modo avión y volver a consultarlo; guardar una lectura, cerrar y reabrir la app y comprobar que aparece en pendientes; intentar crear otra lectura para el mismo medidor y mes y comprobar que se rechaza. No se encontró una prueba automatizada específica de SQLite en el repositorio.
## Uso de IA
Consulta de esta tarea: analizar cómo persistir la caché y las lecturas para trabajo de campo sin cobertura, comparando AsyncStorage, WatermelonDB y SQLite. La IA recomendó priorizar una base relacional local por la restricción de duplicados y las consultas por periodo. Se acepta esa recomendación porque `src/database/sqlite.ts` ya implementa esas tablas y restricciones; se descarta introducir WatermelonDB por el costo y la complejidad adicionales para el alcance actual.
