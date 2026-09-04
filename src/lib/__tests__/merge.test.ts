import { describe, expect, it } from 'vitest';
import {
  COLLECTION_KIND,
  KIND_COLLECTION,
  SYNCED_COLLECTIONS,
  countPending,
  mergeCollection,
  pendingChanges,
} from '../sync/merge';
import { EMPTY_DATA, type Feed } from '../types';

const feed = (id: string, updatedAt: string, amountMl = 60, deletedAt?: string): Feed => ({
  id,
  updatedAt,
  deletedAt,
  babyId: 'b1',
  kind: 'bottle',
  startedAt: '2026-05-01T08:00:00.000Z',
  amountMl,
});

describe('mergeCollection', () => {
  it('übernimmt Einträge, die es lokal noch nicht gibt', () => {
    const result = mergeCollection([feed('a', '2026-05-01T10:00:00.000Z')], [
      feed('b', '2026-05-01T11:00:00.000Z'),
    ]);
    expect(result.changed).toBe(true);
    expect(result.merged.map((f) => f.id).sort()).toEqual(['a', 'b']);
  });

  it('lässt die neuere Fassung gewinnen', () => {
    const local = [feed('a', '2026-05-01T10:00:00.000Z', 60)];
    const remote = [feed('a', '2026-05-01T12:00:00.000Z', 90)];
    const result = mergeCollection(local, remote);
    expect(result.changed).toBe(true);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].amountMl).toBe(90);
  });

  it('behält die lokale Fassung, wenn sie neuer ist', () => {
    const local = [feed('a', '2026-05-01T12:00:00.000Z', 90)];
    const remote = [feed('a', '2026-05-01T10:00:00.000Z', 60)];
    const result = mergeCollection(local, remote);
    expect(result.changed).toBe(false);
    expect(result.merged[0].amountMl).toBe(90);
  });

  it('behält bei gleichem Zeitstempel die lokale Fassung', () => {
    const at = '2026-05-01T10:00:00.000Z';
    const result = mergeCollection([feed('a', at, 60)], [feed('a', at, 90)]);
    expect(result.changed).toBe(false);
    expect(result.merged[0].amountMl).toBe(60);
  });

  it('übernimmt eine Löschung vom anderen Gerät', () => {
    const local = [feed('a', '2026-05-01T10:00:00.000Z')];
    const remote = [feed('a', '2026-05-01T11:00:00.000Z', 60, '2026-05-01T11:00:00.000Z')];
    const result = mergeCollection(local, remote);
    expect(result.merged[0].deletedAt).toBe('2026-05-01T11:00:00.000Z');
  });

  it('lässt eine Löschung nicht durch eine ältere Fassung wiederauferstehen', () => {
    const local = [feed('a', '2026-05-01T12:00:00.000Z', 60, '2026-05-01T12:00:00.000Z')];
    const remote = [feed('a', '2026-05-01T10:00:00.000Z', 60)];
    const result = mergeCollection(local, remote);
    expect(result.merged[0].deletedAt).toBe('2026-05-01T12:00:00.000Z');
  });

  it('rührt den Bestand nicht an, wenn nichts hereinkommt', () => {
    const local = [feed('a', '2026-05-01T10:00:00.000Z')];
    const result = mergeCollection(local, []);
    expect(result.changed).toBe(false);
    expect(result.merged).toBe(local);
  });
});

describe('pendingChanges', () => {
  it('liefert ohne Zeitpunkt alles - so wandert der Altbestand beim ersten Anmelden hoch', () => {
    const items = [feed('a', '2026-05-01T10:00:00.000Z'), feed('b', '2026-05-02T10:00:00.000Z')];
    expect(pendingChanges(items)).toHaveLength(2);
  });

  it('liefert nur Einträge, die neuer sind als der letzte Upload', () => {
    const items = [feed('a', '2026-05-01T10:00:00.000Z'), feed('b', '2026-05-02T10:00:00.000Z')];
    const pending = pendingChanges(items, '2026-05-01T12:00:00.000Z');
    expect(pending.map((f) => f.id)).toEqual(['b']);
  });
});

describe('countPending', () => {
  it('zählt über alle Sammlungen', () => {
    const data = {
      ...EMPTY_DATA,
      feeds: [feed('a', '2026-05-02T10:00:00.000Z')],
      diapers: [
        { id: 'd1', updatedAt: '2026-05-02T11:00:00.000Z', babyId: 'b1', at: '', kind: 'wet' as const },
      ],
    };
    expect(countPending(data, '2026-05-01T00:00:00.000Z')).toBe(2);
    expect(countPending(data, '2026-05-03T00:00:00.000Z')).toBe(0);
  });
});

describe('Sammlungs-Zuordnung', () => {
  it('ist in beide Richtungen vollständig', () => {
    for (const collection of SYNCED_COLLECTIONS) {
      expect(KIND_COLLECTION[COLLECTION_KIND[collection]]).toBe(collection);
    }
  });
});
