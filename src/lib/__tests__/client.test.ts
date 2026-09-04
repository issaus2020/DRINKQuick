import { describe, expect, it } from 'vitest';
import { normalizeProjectUrl } from '../sync/client';

describe('normalizeProjectUrl', () => {
  it('lässt eine saubere Projekt-Adresse unverändert', () => {
    expect(normalizeProjectUrl('https://abcdef.supabase.co')).toBe('https://abcdef.supabase.co');
  });

  it('entfernt den Schrägstrich am Ende', () => {
    // Der häufigste Kopierfehler: er erzeugt "//auth/v1/..." und damit
    // "Invalid path specified in request URL".
    expect(normalizeProjectUrl('https://abcdef.supabase.co/')).toBe('https://abcdef.supabase.co');
    expect(normalizeProjectUrl('https://abcdef.supabase.co///')).toBe('https://abcdef.supabase.co');
  });

  it('wirft einen mitkopierten Pfad weg', () => {
    expect(normalizeProjectUrl('https://abcdef.supabase.co/rest/v1')).toBe(
      'https://abcdef.supabase.co',
    );
    expect(normalizeProjectUrl('https://abcdef.supabase.co/auth/v1/')).toBe(
      'https://abcdef.supabase.co',
    );
  });

  it('entfernt Leerzeichen aus dem Kopieren', () => {
    expect(normalizeProjectUrl('  https://abcdef.supabase.co  ')).toBe(
      'https://abcdef.supabase.co',
    );
  });

  it('kommt mit einer Adresse ohne Schema zurecht', () => {
    expect(normalizeProjectUrl('abcdef.supabase.co/')).toBe('abcdef.supabase.co');
  });

  it('behandelt Leeres als nicht konfiguriert', () => {
    expect(normalizeProjectUrl(undefined)).toBeUndefined();
    expect(normalizeProjectUrl('')).toBeUndefined();
    expect(normalizeProjectUrl('   ')).toBeUndefined();
  });
});
