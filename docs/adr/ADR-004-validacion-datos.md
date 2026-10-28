# ADR-004: Validar entradas mediante expresiones regulares y reglas dinámicas de formulario sin librerías externas

## Estado
Aceptado.

## Fecha
2026-10-26

## Requisitos relacionados
R2 (rechazar códigos de medidor mal formados antes de consultar), R5 (validar campos según el estado del medidor) y R6 (detectar consumos anómalos).

## Contexto
Un código de medidor mal formado no debe originar consultas inútiles a MockAPI ni lecturas a la base SQLite local. Asimismo, las reglas de captura de campo cambian dinámicamente según el estado del medidor (normal, inaccesible o dañado), y los consumos que excedan tres veces el promedio mensual deben activar confirmaciones obligatorias de seguridad. Se requiere mantener el mínimo número de dependencias externas en el proyecto para no comprometer el presupuesto de librerías de la prueba.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| Esquemas con Zod / Yup | Validación declarativa de esquemas y tipos estáticos. | Suma una dependencia adicional de terceros en `package.json` cuando la lógica se resuelve de forma nativa y eficiente. |
| Expresión Regular estricta en UI y reglas integradas en React Hook Form | Cero dependencias adicionales añadidas para validación. Permite bloquear en tiempo real la acción de búsqueda con `/^MED-\d{6}$/` y controlar obligatoriedad condicional directamente en el formulario. | Exige mantener la consistencia de la expresión regular y de las condiciones manuales en los componentes correspondientes. |

## Decisión
Se decide no instalar Zod ni librerías externas de esquemas. La validación del formato de medidor (R2) se ejecuta mediante la expresión regular `/^MED-\d{6}$/` en la pantalla de búsqueda, inhabilitando la consulta si no coincide con el patrón exacto. Las validaciones condicionales de los tres estados (R5) y el cálculo de consumo anómalo (R6) se delegan a las reglas nativas del formulario (`react-hook-form`) y a funciones puras de cálculo en `src/utils/`.

## Consecuencias
* Se evita sumar dependencias de validación a `package.json`, cumpliendo con la política de justificación estricta de paquetes.
* Se garantiza que ningún código inválido genere tráfico de red o consultas SQL.
* **Riesgo:** Si en el futuro se incorporan más pantallas que requieran validar el código, la lógica de validación debe mantenerse centralizada en utilidades para evitar discrepancias.

## Verificación
* Validación de formato y bloqueo de botón en `app/(tabs)/buscar.tsx`.
* Reglas condicionales de estado y cálculo de consumo mayor a 3x en `app/lectura/[id].tsx`.
* En el teléfono: ingresar "MED-123", comprobar el mensaje de error y que el botón permanece inhabilitado; en el formulario, seleccionar "INACCESIBLE" y verificar que el campo de lectura se bloquea y el motivo se vuelve obligatorio.

## Uso de IA
Se le consultó a la IA sobre el uso de esquemas con Zod versus validación directa. Aunque la IA propuso inicialmente esquemas formales con Zod, se descartó su sugerencia para evitar penalizaciones por dependencias no estrictamente indispensables, implementando la validación directa con Regex y React Hook Form.