# ADR-003: Mantener sesión y borradores con Zustand persistido en AsyncStorage
## Estado
Aceptado.
## Fecha
2026-10-26
## Requisitos relacionados
R1 (conservar la sesión), R8 (recuperar borradores tras cierre inesperado) y R9 (compartir el estado de conectividad y pendientes).
## Contexto
La sesión debe seguir disponible tras cerrar y volver a abrir la app. En campo, una llamada o el cierre del proceso no debe obligar al técnico a volver a capturar una lectura incompleta. Varias pantallas necesitan consultar el estado de autenticación, del borrador y de la conexión, sin convertir cada pantalla en propietaria de una copia independiente.
## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| React Context más almacenamiento manual | Incluido en React, sin una dependencia adicional para compartir estado; adecuado para pocos valores de baja frecuencia de cambio. | Requiere construir y mantener manualmente persistencia, hidratación y selectores; aumenta el riesgo de rerenders amplios y lógica repetida en los stores de sesión y borrador. |
| Redux Toolkit más persistencia | Convenciones claras, herramientas de depuración y estructura útil para flujos grandes o equipos con estado complejo. | Añade estructura y configuración no necesarias para tres stores pequeños; mayor costo de aprendizaje e integración para una prueba móvil de alcance acotado. |
| Zustand con middleware `persist` y AsyncStorage | API pequeña; permite persistir stores seleccionados y mantener conectividad como estado efímero; ambas dependencias ya existen en el proyecto. | La hidratación asíncrona debe tratarse antes de ofrecer continuar un borrador; AsyncStorage no cifra los datos y la forma del borrador es actualmente amplia (`Record<string, unknown>`). |
## Decisión
Usar Zustand para los stores globales y el middleware `persist` con AsyncStorage en sesión y borradores. El store de red se mantiene en memoria porque su dato procede de NetInfo y debe representar el estado actual. La pantalla de lectura espera la hidratación del borrador y ofrece continuar o descartarlo cuando corresponde al medidor abierto.
## Consecuencias
El login y los borradores sobreviven a reinicios y se comparten entre rutas; el estado de conectividad no conserva valores potencialmente obsoletos entre ejecuciones. `authStore` persiste el código de usuario y el indicador de autenticación, no la contraseña. Esta persistencia no proporciona autenticación de servidor: las credenciales de acceso visibles en la pantalla son de demostración y el store solo conserva sesión local. Como riesgo, el borrador se serializa sin cifrado y puede contener información de lectura; debe limitarse su contenido y reevaluarse si se almacenan datos sensibles reales. También se debe mantener sincronizada la forma persistida del borrador con los cambios del formulario.
## Verificación
Implementación: [src/store/authStore.ts](../../src/store/authStore.ts), [src/store/draftStore.ts](../../src/store/draftStore.ts), [src/store/syncStore.ts](../../src/store/syncStore.ts), recuperación del borrador en [app/lectura/[id].tsx](../../app/lectura/[id].tsx) e ingreso en [app/index.tsx](../../app/index.tsx). En un teléfono: iniciar sesión, cerrar y abrir la app y confirmar que la ruta autenticada se conserva; editar una lectura, forzar el cierre antes de guardarla, volver a esa lectura y comprobar las opciones Continuar/Descartar; cambiar la conexión y observar que el estado se actualiza sin reiniciar.
## Uso de IA
Consulta de esta tarea: comparar Context, Redux Toolkit y Zustand para sesión, borradores y estado de red en una app de campo. La IA sugirió persistir únicamente estado que deba sobrevivir reinicios y mantener la conectividad efímera. Se acepta porque los stores existentes aplican esa separación; se descarta persistir `isConnected`, que podría describir una conexión antigua después de reiniciar.
