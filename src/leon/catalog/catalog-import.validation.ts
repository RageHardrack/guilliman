/**
 * Validation for the catalog import body.
 *
 * Guilliman registers no global `ValidationPipe` and does not depend on
 * `class-validator`, so the shape of a 7 MB-ish import cannot be trusted to a
 * decorator pipeline. This module is pure: it turns `unknown` into a validated
 * payload or throws a single, testable error type that the service maps to 400.
 */

/** The largest batch the API accepts in one request (see S5 of leon-catalog-api). */
export const MAX_FACTIONS_PER_IMPORT = 24;

const META_FIELDS = [
  'gameSystem',
  'edition',
  'version',
  'updatedDate',
] as const;

export class CatalogImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogImportError';
  }
}

export interface CatalogImportMeta {
  gameSystem: string;
  edition: string;
  version: string;
  updatedDate: string;
}

export interface CatalogImportFaction {
  id: string;
  name: string;
  /** Recomputed from the payload so the index never trusts a client count. */
  units: number;
  detachments: number;
  payload: Record<string, unknown>;
}

export interface CatalogImportPayload {
  meta: CatalogImportMeta;
  factions: CatalogImportFaction[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(
  source: Record<string, unknown>,
  field: string,
  path: string,
): string {
  const value = source[field];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CatalogImportError(`${path}.${field} must be a non-empty string`);
  }
  return value.trim();
}

function parseMeta(meta: unknown): CatalogImportMeta {
  if (!isRecord(meta)) {
    throw new CatalogImportError('meta must be an object');
  }

  const parsed = {} as CatalogImportMeta;
  for (const field of META_FIELDS) {
    parsed[field] = requireString(meta, field, 'meta');
  }

  return parsed;
}

function parseFaction(entry: unknown, index: number): CatalogImportFaction {
  const path = `factions[${index}]`;

  if (!isRecord(entry)) {
    throw new CatalogImportError(`${path} must be an object`);
  }

  const id = requireString(entry, 'id', path);
  const name = requireString(entry, 'name', path);

  const pkg = entry.package;
  if (!isRecord(pkg)) {
    throw new CatalogImportError(
      `${path}.package must be a catalog package object`,
    );
  }

  const packageFactions = pkg.factions;
  if (!Array.isArray(packageFactions) || packageFactions.length !== 1) {
    throw new CatalogImportError(
      `${path}.package.factions must contain exactly one faction`,
    );
  }

  const faction = packageFactions[0];
  if (!isRecord(faction)) {
    throw new CatalogImportError(
      `${path}.package.factions must contain exactly one faction`,
    );
  }

  if (faction.id !== id) {
    throw new CatalogImportError(
      `${path}.package faction id must match the declared id`,
    );
  }

  const units = faction.units;
  const detachments = faction.detachments;
  if (!Array.isArray(units) || !Array.isArray(detachments)) {
    throw new CatalogImportError(
      `${path}.package faction must declare units and detachments arrays`,
    );
  }

  return {
    id,
    name,
    units: units.length,
    detachments: detachments.length,
    payload: pkg,
  };
}

/** Validates the import body, recomputing the counts of every faction. */
export function parseCatalogImport(body: unknown): CatalogImportPayload {
  if (!isRecord(body)) {
    throw new CatalogImportError(
      'The catalog import body must be a JSON object',
    );
  }

  const meta = parseMeta(body.meta);

  const factions = body.factions;
  if (!Array.isArray(factions)) {
    throw new CatalogImportError('factions must be an array');
  }
  if (factions.length < 1 || factions.length > MAX_FACTIONS_PER_IMPORT) {
    throw new CatalogImportError(
      `factions must contain between 1 and ${MAX_FACTIONS_PER_IMPORT} items`,
    );
  }

  return {
    meta,
    factions: factions.map((entry, index) => parseFaction(entry, index)),
  };
}
