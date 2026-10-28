# ADR-002: Consultar MockAPI con Fetch API nativo sin añadir Axios

## Estado
Aceptado.

## Fecha
2026-10-26

## Requisitos relacionados
R3 (obtener y almacenar datos de medidores) y R9 (enviar lecturas cuando haya conectividad).

## Contexto
La pantalla de búsqueda necesita consultar el sistema de la oficina simulado cuando el medidor no se encuentra en el dispositivo, y el servicio de sincronización en segundo plano debe enviar las lecturas pendientes. Cada dependencia agregada al proyecto debe corresponder estrictamente a un requisito del cliente, por lo que debe evaluarse si una librería de red externa está justificada.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| Axios | Manejo directo de instancias, interceptores y transformación automática de respuestas JSON. | Añade una dependencia de terceros en `package.json` que no aporta funcionalidades exclusivas indispensables para dos endpoints REST básicos. |
| Fetch API nativo | Viene integrado en el runtime de JavaScript y Expo, con soporte completo para GET y POST sin agregar librerías adicionales. | Requiere comprobación manual de `response.ok`, control explícito de excepciones de red y serialización manual del payload. |

## Decisión
Se usa `Fetch API` nativo en `src/api/mockapi.ts` para las operaciones `GET /medidores` y `POST /lecturas`, sin instalar Axios. Se valida la respuesta HTTP, se descartan los identificadores locales al enviar el payload y se delega la persistencia durable a SQLite. Para la carga de imágenes a Cloudinary se utiliza igualmente la API HTTP estándar mediante `FormData`.

## Consecuencias
* Se mantiene limpio el archivo `package.json` evitando librerías de red innecesarias.
* El código asume el manejo explícito de errores de red (como `UnknownHostException` en modo avión) mediante bloques `try/catch`.
* **Riesgo:** Si el backend simulado tarda en responder, no se cuenta con un timeout configurable por defecto sin construir un `AbortController` manual.

## Verificación
* En `package.json` no figura `axios`.
* El cliente está implementado en `src/api/mockapi.ts` y se invoca desde `app/(tabs)/buscar.tsx` y `app/_layout.tsx`.
* En el teléfono: consultar con red un medidor no almacenado para verificar la descarga; probar la consulta en modo avión y comprobar que el error de red se gestiona amigablemente sin colapsar la app.

## Uso de IA
Se consultó a la IA si se justificaba el uso de Axios frente a Fetch nativo. La IA sugirió mantener un cliente HTTP mínimo con Fetch; se aceptó esta recomendación para cumplir con la restricción de dependencias de la rúbrica y se descartó la instalación de paquetes adicionales de red o SDKs pesados.