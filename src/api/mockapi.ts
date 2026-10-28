import type { MedidorCache } from '../database/sqlite';

const BASE_URL = process.env.EXPO_PUBLIC_MOCKAPI_URL ?? '';

function getBaseUrl(): string {
  if (!BASE_URL) {
    throw new Error('Define EXPO_PUBLIC_MOCKAPI_URL en el archivo .env.');
  }

  return BASE_URL.replace(/\/+$/, '');
}

export async function fetchMedidorAPI(codigo: string): Promise<MedidorCache> {
  const response = await fetch(
    `${getBaseUrl()}/medidores?codigo=${encodeURIComponent(codigo)}`,
  );

  if (!response.ok) {
    throw new Error(`Error al consultar el medidor: ${response.status}`);
  }

  const medidores = (await response.json()) as MedidorCache[];
  const medidor = medidores[0];

  if (!medidor) {
    throw new Error('Medidor no encontrado en el sistema');
  }

  return {
    codigo: medidor.codigo,
    direccion: medidor.direccion,
    sector: medidor.sector,
    numero_cuenta: medidor.numero_cuenta,
    estado_actual: medidor.estado_actual,
    ultima_lectura: medidor.ultima_lectura,
    fecha_ultima_lectura: medidor.fecha_ultima_lectura,
    consumo_promedio: medidor.consumo_promedio,
  };
}

export async function postLecturaAPI(lectura: object): Promise<unknown> {
  const payload = Object.fromEntries(
    Object.entries(lectura).filter(
      ([key]) => key !== 'id' && key !== 'estado_sync',
    ),
  );
  const response = await fetch(`${getBaseUrl()}/lecturas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Error al enviar la lectura: ${response.status}`);
  }

  return response.json();
}