import { describe, it, expect } from 'bun:test';
import { ADMIN_BLOCK_REGISTRY } from './adminRegistry';

describe('ADMIN_BLOCK_REGISTRY — estructura', () => {
  it('todas las entradas tienen label, schema y defaultProps', () => {
    for (const [key, entry] of Object.entries(ADMIN_BLOCK_REGISTRY)) {
      expect(entry.label,        `${key}.label`).toBeTruthy();
      expect(entry.schema,       `${key}.schema`).toBeTruthy();
      expect(entry.defaultProps, `${key}.defaultProps`).toBeTruthy();
    }
  });

  it('scope solo puede ser "site", "embedded" o ausente', () => {
    const allowed = new Set(['site', 'embedded', undefined]);
    for (const [key, entry] of Object.entries(ADMIN_BLOCK_REGISTRY)) {
      expect(allowed.has(entry.scope), `${key}.scope inválido: ${entry.scope}`).toBe(true);
    }
  });
});

describe('ADMIN_BLOCK_REGISTRY — header y footer', () => {
  it('header tiene scope "site"', () => {
    expect(ADMIN_BLOCK_REGISTRY['header']?.scope).toBe('site');
  });

  it('footer tiene scope "site"', () => {
    expect(ADMIN_BLOCK_REGISTRY['footer']?.scope).toBe('site');
  });
});

describe('ADMIN_BLOCK_REGISTRY — countdown', () => {
  it('label es "Hero — Cuenta regresiva"', () => {
    expect(ADMIN_BLOCK_REGISTRY['countdown']?.label).toBe('Hero — Cuenta regresiva');
  });

  it('fieldLabels.duration tiene etiqueta descriptiva', () => {
    expect(ADMIN_BLOCK_REGISTRY['countdown']?.fieldLabels?.['duration'])
      .toBe('Días de aviso previo al evento');
  });

  it('no tiene scope site ni embedded (es un bloque de página)', () => {
    expect(ADMIN_BLOCK_REGISTRY['countdown']?.scope).toBeUndefined();
  });

  it('defaultProps incluye phases con las 4 fases requeridas', () => {
    const phases = ADMIN_BLOCK_REGISTRY['countdown']?.defaultProps['phases'] as Record<string, unknown>;
    expect(phases).toBeTruthy();
    expect(Object.keys(phases)).toEqual(['pending', 'upcoming', 'live', 'finished']);
  });
});

describe('ADMIN_BLOCK_REGISTRY — richText', () => {
  it('fieldOverrides convierte content a textarea', () => {
    expect(ADMIN_BLOCK_REGISTRY['richText']?.fieldOverrides?.['content']?.inputType).toBe('textarea');
  });
});

describe('ADMIN_BLOCK_REGISTRY — fieldLabels', () => {
  it('fieldLabels es opcional y solo lo tienen las entradas que lo necesitan', () => {
    const conLabels = Object.entries(ADMIN_BLOCK_REGISTRY)
      .filter(([, e]) => e.fieldLabels !== undefined)
      .map(([k]) => k);
    expect(conLabels).toContain('countdown');
  });
});
