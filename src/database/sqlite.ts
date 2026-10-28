import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'epmaps.db';

export interface MedidorCache {
  codigo: string;
  direccion: string;
  sector: string;
  numero_cuenta: string;
  estado_actual: string;
  ultima_lectura: number;
  fecha_ultima_lectura: string;
  consumo_promedio: number;
}

export type EstadoSync = 'PENDIENTE' | 'ENVIADO';

export interface LecturaLocal {
  id: number;
  codigo_medidor: string;
  estado_medidor: string;
  lectura_actual: number | null;
  motivo_inaccesible: string | null;
  descripcion_dano: string | null;
  foto_uri: string | null;
  estado_sync: EstadoSync;
  mes_anio: string;
}

export type NuevaLectura = Omit<
  LecturaLocal,
  | 'id'
  | 'estado_sync'
  | 'lectura_actual'
  | 'motivo_inaccesible'
  | 'descripcion_dano'
  | 'foto_uri'
> & {
  lectura_actual?: number | null;
  motivo_inaccesible?: string | null;
  descripcion_dano?: string | null;
  foto_uri?: string | null;
};

export type DatosLectura = Partial<Omit<LecturaLocal, 'id' | 'estado_sync'>>;

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndInitializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS medidores_cache (
      codigo TEXT PRIMARY KEY NOT NULL,
      direccion TEXT NOT NULL,
      sector TEXT NOT NULL,
      numero_cuenta TEXT NOT NULL,
      estado_actual TEXT NOT NULL,
      ultima_lectura REAL NOT NULL,
      fecha_ultima_lectura TEXT NOT NULL,
      consumo_promedio REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lecturas_locales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_medidor TEXT NOT NULL,
      estado_medidor TEXT NOT NULL,
      lectura_actual REAL NULL,
      motivo_inaccesible TEXT NULL,
      descripcion_dano TEXT NULL,
      foto_uri TEXT NULL,
      estado_sync TEXT NOT NULL CHECK (estado_sync IN ('PENDIENTE', 'ENVIADO')),
      mes_anio TEXT NOT NULL,
      UNIQUE (codigo_medidor, mes_anio)
    );
  `);

  return database;
}

function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndInitializeDatabase().catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

function validateMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error("mes_anio debe tener el formato 'YYYY-MM'.");
  }
}

export async function initDB(): Promise<void> {
  await getDatabase();
}

export async function saveMedidorCache(medidor: MedidorCache): Promise<void> {
  const database = await getDatabase();

  await database.runAsync(
    `INSERT INTO medidores_cache (
      codigo,
      direccion,
      sector,
      numero_cuenta,
      estado_actual,
      ultima_lectura,
      fecha_ultima_lectura,
      consumo_promedio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(codigo) DO UPDATE SET
      direccion = excluded.direccion,
      sector = excluded.sector,
      numero_cuenta = excluded.numero_cuenta,
      estado_actual = excluded.estado_actual,
      ultima_lectura = excluded.ultima_lectura,
      fecha_ultima_lectura = excluded.fecha_ultima_lectura,
      consumo_promedio = excluded.consumo_promedio`,
    medidor.codigo,
    medidor.direccion,
    medidor.sector,
    medidor.numero_cuenta,
    medidor.estado_actual,
    medidor.ultima_lectura,
    medidor.fecha_ultima_lectura,
    medidor.consumo_promedio,
  );
}

export async function getMedidorCache(codigo: string): Promise<MedidorCache | null> {
  const database = await getDatabase();

  return database.getFirstAsync<MedidorCache>(
    'SELECT * FROM medidores_cache WHERE codigo = ?',
    codigo,
  );
}

export async function saveLectura(lectura: NuevaLectura): Promise<number> {
  validateMonth(lectura.mes_anio);

  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO lecturas_locales (
      codigo_medidor,
      estado_medidor,
      lectura_actual,
      motivo_inaccesible,
      descripcion_dano,
      foto_uri,
      estado_sync,
      mes_anio
    )
    SELECT ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?
    WHERE NOT EXISTS (
      SELECT 1
      FROM lecturas_locales
      WHERE codigo_medidor = ?
        AND mes_anio = ?
        AND estado_sync IN ('PENDIENTE', 'ENVIADO')
    )`,
    lectura.codigo_medidor,
    lectura.estado_medidor,
    lectura.lectura_actual ?? null,
    lectura.motivo_inaccesible ?? null,
    lectura.descripcion_dano ?? null,
    lectura.foto_uri ?? null,
    lectura.mes_anio,
    lectura.codigo_medidor,
    lectura.mes_anio,
  );

  if (result.changes === 0) {
    throw new Error(
      `Ya existe una lectura para el medidor ${lectura.codigo_medidor} en ${lectura.mes_anio}.`,
    );
  }

  return result.lastInsertRowId;
}

export async function updateLectura(id: number, datos: DatosLectura): Promise<void> {
  const fields = [
    'codigo_medidor',
    'estado_medidor',
    'lectura_actual',
    'motivo_inaccesible',
    'descripcion_dano',
    'foto_uri',
    'mes_anio',
  ] as const;
  const assignments: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];

  for (const field of fields) {
    const value = datos[field];

    if (value !== undefined) {
      if (field === 'mes_anio') {
        if (typeof value !== 'string') {
          throw new Error("mes_anio debe tener el formato 'YYYY-MM'.");
        }
        validateMonth(value);
      }
      assignments.push(`${field} = ?`);
      values.push(value);
    }
  }

  if (assignments.length === 0) {
    throw new Error('Debe proporcionar al menos un campo para actualizar la lectura.');
  }

  const database = await getDatabase();
  const result = await database.runAsync(
    `UPDATE lecturas_locales
    SET ${assignments.join(', ')}
    WHERE id = ? AND estado_sync = 'PENDIENTE'`,
    ...values,
    id,
  );

  if (result.changes === 0) {
    throw new Error(`No se pudo actualizar la lectura ${id}: no existe o ya fue enviada.`);
  }
}

export async function getLecturasPendientes(): Promise<LecturaLocal[]> {
  const database = await getDatabase();

  return database.getAllAsync<LecturaLocal>(
    `SELECT *
    FROM lecturas_locales
    WHERE estado_sync = 'PENDIENTE'
    ORDER BY id ASC`,
  );
}

export async function getLecturas(): Promise<LecturaLocal[]> {
  const database = await getDatabase();

  return database.getAllAsync<LecturaLocal>(
    `SELECT *
    FROM lecturas_locales
    WHERE estado_sync IN ('PENDIENTE', 'ENVIADO')
    ORDER BY id DESC`,
  );
}

export async function getLecturaById(id: number): Promise<LecturaLocal | null> {
  const database = await getDatabase();

  return database.getFirstAsync<LecturaLocal>(
    'SELECT * FROM lecturas_locales WHERE id = ?',
    id,
  );
}

export async function markAsSent(id: number): Promise<void> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `UPDATE lecturas_locales
    SET estado_sync = 'ENVIADO'
    WHERE id = ? AND estado_sync = 'PENDIENTE'`,
    id,
  );

  if (result.changes === 0) {
    throw new Error(`No se pudo marcar la lectura ${id} como enviada: no existe o ya fue enviada.`);
  }
}