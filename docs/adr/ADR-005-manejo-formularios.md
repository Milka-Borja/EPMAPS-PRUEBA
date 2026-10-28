# ADR-005: Gestionar la captura de lecturas con React Hook Form
## Estado
Aceptado.
## Fecha
2026-10-26
## Requisitos relacionados
R5 (captura de lecturas con campos variables por estado) y R6 (validar la lectura y dar paso a la confirmación de consumos anómalos).
## Contexto
El formulario de trabajo de campo presenta campos diferentes según la condición del medidor. Cambiar entre normal, inaccesible y dañado requiere ocultar o bloquear campos y validar los valores visibles sin perder la capacidad de guardar borradores. En teléfonos de recursos modestos conviene evitar renders y estados duplicados innecesarios.
## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| `useState` controlado para cada campo | React lo incluye y ofrece control directo sobre cambios, borradores y visibilidad condicional. | Multiplica estados, setters y validaciones en una pantalla extensa; cada actualización puede renderizar de nuevo todo el formulario y las reglas condicionales quedarían distribuidas. |
| Formik | Proporciona un modelo conocido para valores, errores y envío, y se integra con esquemas de validación. | Añade otra dependencia y una capa de configuración; no hay evidencia de que aporte una ventaja sobre la librería ya instalada para este formulario. |
| React Hook Form | Mantiene valores y validación mediante `Controller`/hooks, se adapta a campos condicionales y reduce la necesidad de manejar manualmente cada actualización. | Los campos desmontados y el borrador deben coordinarse con `shouldUnregister`; las reglas específicas deben mantenerse sincronizadas con la lógica del estado del medidor. |
## Decisión
Usar React Hook Form para gestionar el formulario de lectura. `useForm`, `Controller` y `useWatch` mantienen y observan campos variables, y las validaciones evitan guardar una lectura normal sin valor, un registro inaccesible sin motivo o un medidor dañado sin descripción. La regla de consumo anómalo se mantiene como validación de negocio complementaria porque requiere datos de caché y confirmación de la persona técnica.
## Consecuencias
Se centralizan valores, errores y envío y se evita un `useState` independiente por campo. Al usar `shouldUnregister: true`, los campos que desaparecen del formulario dejan de registrarse; el código debe continuar limpiando campos incompatibles al cambiar de estado y guardar explícitamente los valores necesarios en el borrador. Riesgo asumido: las reglas de formulario están definidas en la pantalla y todavía no se integran con el esquema Zod decidido en ADR-004, lo que puede provocar discrepancias hasta completar esa integración.
## Verificación
Implementación en [app/lectura/[id].tsx](../../app/lectura/[id].tsx) (`useForm`, `Controller`, `useWatch` y reglas de los campos). Dependencia en `package.json`. En el teléfono, cambiar entre los tres estados y comprobar que se muestran solo los campos pertinentes; intentar guardar con campos obligatorios vacíos; completar los datos, regresar a la pantalla y confirmar que el borrador conserva los valores. No se encontró una prueba automatizada de formulario.
## Uso de IA
Consulta de esta tarea: comparar estado controlado, Formik y React Hook Form para un formulario de lectura con campos dinámicos en móvil. La IA sugirió conservar la librería que ya está incorporada en lugar de sumar una alternativa. Se acepta porque la pantalla usa `Controller` y reglas condicionales y porque reducir dependencias es prioritario; se descarta trasladar toda la lógica a `useState`, que duplicaría coordinación y validación.
