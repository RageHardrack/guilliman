import { describe, expect, it } from 'vitest';

import {
  CatalogImportError,
  MAX_FACTIONS_PER_IMPORT,
  parseCatalogImport,
} from './catalog-import.validation';

function factionPayload(id: string, units: number, detachments: number) {
  return {
    gameSystem: 'wh40k-11e',
    edition: '11th',
    version: '11.0.20261021',
    updatedDate: '2026-10-21',
    factions: [
      {
        id,
        name: `Faction ${id}`,
        units: Array.from({ length: units }, (_, index) => ({
          id: `${id}-unit-${index}`,
        })),
        detachments: Array.from({ length: detachments }, (_, index) => ({
          id: `${id}-det-${index}`,
        })),
      },
    ],
  };
}

function validBody() {
  return {
    meta: {
      gameSystem: 'wh40k-11e',
      edition: '11th',
      version: '11.0.20261021',
      updatedDate: '2026-10-21',
    },
    factions: [
      { id: 'SM', name: 'Space Marines', package: factionPayload('SM', 2, 1) },
    ],
  };
}

describe('parseCatalogImport', () => {
  it('recomputes the faction counts from the payload and keeps the metadata', () => {
    const parsed = parseCatalogImport(validBody());

    expect(parsed.meta).toEqual({
      gameSystem: 'wh40k-11e',
      edition: '11th',
      version: '11.0.20261021',
      updatedDate: '2026-10-21',
    });
    expect(parsed.factions).toHaveLength(1);
    expect(parsed.factions[0].id).toBe('SM');
    expect(parsed.factions[0].name).toBe('Space Marines');
    expect(parsed.factions[0].units).toBe(2);
    expect(parsed.factions[0].detachments).toBe(1);
    expect(parsed.factions[0].payload).toEqual(factionPayload('SM', 2, 1));
  });

  it('accepts a batch of factions', () => {
    const body = validBody();
    body.factions.push({
      id: 'ORK',
      name: 'Orks',
      package: factionPayload('ORK', 3, 0),
    });

    const parsed = parseCatalogImport(body);

    expect(parsed.factions.map((faction) => faction.id)).toEqual(['SM', 'ORK']);
  });

  it(`rejects a batch larger than ${MAX_FACTIONS_PER_IMPORT} factions`, () => {
    const body = validBody();
    for (let index = 1; index < MAX_FACTIONS_PER_IMPORT + 1; index += 1) {
      const id = `F${index}`;
      body.factions.push({
        id,
        name: `Faction ${id}`,
        package: factionPayload(id, 0, 0),
      });
    }

    expect(() => parseCatalogImport(body)).toThrow(CatalogImportError);
    expect(() => parseCatalogImport(body)).toThrow(
      `factions must contain between 1 and ${MAX_FACTIONS_PER_IMPORT} items`,
    );
  });

  it('rejects a body that is not an object', () => {
    expect(() => parseCatalogImport('not json')).toThrow(
      'The catalog import body must be a JSON object',
    );
    expect(() => parseCatalogImport(null)).toThrow(
      'The catalog import body must be a JSON object',
    );
  });

  it('rejects a missing or incomplete meta block', () => {
    expect(() => parseCatalogImport({ factions: [] })).toThrow(
      'meta must be an object',
    );

    const body = validBody();
    expect(() =>
      parseCatalogImport({ ...body, meta: { ...body.meta, version: '  ' } }),
    ).toThrow('meta.version must be a non-empty string');
  });

  it('rejects an empty faction list', () => {
    expect(() => parseCatalogImport({ ...validBody(), factions: [] })).toThrow(
      `factions must contain between 1 and ${MAX_FACTIONS_PER_IMPORT} items`,
    );
  });

  it('rejects a package whose faction id differs from the declared id', () => {
    const body = validBody();
    body.factions[0].package = factionPayload('ORK', 1, 0);

    expect(() => parseCatalogImport(body)).toThrow(
      'factions[0].package faction id must match the declared id',
    );
  });

  it('rejects a package carrying more than one faction', () => {
    const body = validBody();
    const pkg = factionPayload('SM', 1, 0) as { factions: unknown[] };
    pkg.factions.push({ id: 'ORK', name: 'Orks', units: [], detachments: [] });
    // Deliberately invalid input: the parser must reject it at runtime.
    (body.factions[0] as { package: unknown }).package = pkg;

    expect(() => parseCatalogImport(body)).toThrow(
      'factions[0].package.factions must contain exactly one faction',
    );
  });

  it('rejects a faction without units and detachments arrays', () => {
    const body = validBody();
    const pkg = factionPayload('SM', 1, 0) as {
      factions: Record<string, unknown>[];
    };
    delete pkg.factions[0].detachments;
    // Deliberately invalid input: the parser must reject it at runtime.
    (body.factions[0] as { package: unknown }).package = pkg;

    expect(() => parseCatalogImport(body)).toThrow(
      'factions[0].package faction must declare units and detachments arrays',
    );
  });

  it('rejects a faction without a usable id or name', () => {
    expect(() =>
      parseCatalogImport({ ...validBody(), factions: [{ name: 'x' }] }),
    ).toThrow('factions[0].id must be a non-empty string');

    const body = validBody();
    body.factions[0] = { ...body.factions[0], name: '' };
    expect(() => parseCatalogImport(body)).toThrow(
      'factions[0].name must be a non-empty string',
    );
  });
});
