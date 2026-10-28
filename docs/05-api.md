# Módulo: Cliente API (MockAPI)
**Objetivo:** Conectar la aplicación con el backend simulado para consultar medidores y enviar lecturas.
**Dependencias:** No agregar Axios; usar `fetch` nativo de JavaScript para no sumar dependencias innecesarias que penalicen la rúbrica.

**Configuración base:**
1. Definir una constante `BASE_URL` (se debe usar la URL generada en MockAPI, ej: `https://[id].mockapi.io/api/v1`).

**Funciones a exportar:**
1. `fetchMedidorAPI(codigo: string)`:
   - Realiza un `GET` a `${BASE_URL}/medidores?codigo=${codigo}`.
   - Si retorna un arreglo con datos, devuelve el primer elemento adaptado a la interfaz `MedidorCache`.
   - Si el arreglo está vacío, lanza un error "Medidor no encontrado en el sistema".
2. `postLecturaAPI(lectura: object)`:
   - Realiza un `POST` a `${BASE_URL}/lecturas` enviando el JSON de la lectura (excluyendo el `id` local y el `estado_sync`).
   - Retorna la respuesta para confirmar que se guardó.