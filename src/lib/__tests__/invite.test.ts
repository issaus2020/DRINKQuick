import { describe, expect, it } from 'vitest';
import { inviteFromUrl, inviteLink } from '../sync/invite';

describe('inviteLink', () => {
  it('hängt den Code an die Adresse', () => {
    expect(inviteLink('K4RT9MPX', 'https://noah-drink.vercel.app')).toBe(
      'https://noah-drink.vercel.app/?einladung=K4RT9MPX',
    );
  });

  it('normalisiert Kleinschreibung und Leerzeichen', () => {
    expect(inviteLink('  k4rt9mpx ', 'https://example.com')).toContain('einladung=K4RT9MPX');
  });
});

describe('inviteFromUrl', () => {
  it('liest einen Code aus der Adresse', () => {
    expect(inviteFromUrl('?einladung=K4RT9MPX')).toBe('K4RT9MPX');
  });

  it('akzeptiert Kleinschreibung aus kopierten Links', () => {
    expect(inviteFromUrl('?einladung=k4rt9mpx')).toBe('K4RT9MPX');
  });

  it('ignoriert Unsinn, statt damit einen Beitritt zu versuchen', () => {
    expect(inviteFromUrl('?einladung=')).toBeUndefined();
    expect(inviteFromUrl('?einladung=hallo%20welt')).toBeUndefined();
    // 0, O, 1 und I kommen in echten Codes nicht vor.
    expect(inviteFromUrl('?einladung=K4RT9MP0')).toBeUndefined();
    expect(inviteFromUrl('?anderes=K4RT9MPX')).toBeUndefined();
    expect(inviteFromUrl('')).toBeUndefined();
  });
});
