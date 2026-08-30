import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, cleanup, within } from '@testing-library/svelte';

afterEach(() => cleanup());

import BrandPreview from './BrandPreview.svelte';

// NOTA: BrandPreview no recibe `previewUrl` — no es un iframe de preview de sitio,
// sino un panel que renderiza los tokens de marca (colores, tipografía, radios,
// sombras) directamente, sin red ni iframe.

const COLORS = {
  primary:    '#1d4ed8',
  accent:     '#f59e0b',
  background: '#ffffff',
};

const TYPOGRAPHY = {
  display: { family: 'Poppins', weights: [700], source: 'google' as const },
  body:    { family: 'Inter', weights: [400], source: 'google' as const },
};

const RADII = { none: '0px', sm: '2px', md: '4px', lg: '8px', xl: '12px', full: '9999px' };
const SHADOWS = { sm: '0 1px 2px rgba(0,0,0,.1)', md: '0 2px 4px rgba(0,0,0,.1)', lg: 'none' };

describe('BrandPreview — renderizado con datos válidos', () => {
  it('renderiza un swatch por cada color', () => {
    const { container } = render(BrandPreview, {
      props: { colors: COLORS, typography: TYPOGRAPHY, radii: RADII, shadows: SHADOWS },
    });
    expect(container.querySelectorAll('[title]').length).toBe(Object.keys(COLORS).length);
  });

  it('usa las etiquetas legibles conocidas para los colores', () => {
    render(BrandPreview, {
      props: { colors: COLORS, typography: TYPOGRAPHY, radii: RADII, shadows: SHADOWS },
    });
    expect(screen.getByText('Primario')).toBeTruthy();
    expect(screen.getByText('Acento')).toBeTruthy();
    expect(screen.getByText('Fondo')).toBeTruthy();
  });

  it('usa la clave cruda como fallback cuando el color no tiene etiqueta conocida', () => {
    render(BrandPreview, {
      props: {
        colors: { color_raro: '#000000' },
        typography: TYPOGRAPHY,
        radii: RADII,
        shadows: SHADOWS,
      },
    });
    expect(screen.getByText('color_raro')).toBeTruthy();
  });

  it('renderiza el preview de tipografía display y body con su family', () => {
    render(BrandPreview, {
      props: { colors: COLORS, typography: TYPOGRAPHY, radii: RADII, shadows: SHADOWS },
    });
    expect(screen.getByText('Display — Poppins')).toBeTruthy();
    expect(screen.getByText('Body — Inter')).toBeTruthy();
    expect(screen.getByText('Aa — Título de ejemplo')).toBeTruthy();
  });

  it('no renderiza el bloque mono cuando typography.mono no está definido', () => {
    render(BrandPreview, {
      props: { colors: COLORS, typography: TYPOGRAPHY, radii: RADII, shadows: SHADOWS },
    });
    expect(screen.queryByText(/^Mono —/)).toBeFalsy();
  });

  it('renderiza el bloque mono cuando typography.mono está definido', () => {
    render(BrandPreview, {
      props: {
        colors: COLORS,
        typography: { ...TYPOGRAPHY, mono: { family: 'Fira Code', weights: [400], source: 'google' as const } },
        radii: RADII,
        shadows: SHADOWS,
      },
    });
    expect(screen.getByText('Mono — Fira Code')).toBeTruthy();
  });

  it('renderiza un swatch por cada clave de radii', () => {
    const { container } = render(BrandPreview, {
      props: { colors: COLORS, typography: TYPOGRAPHY, radii: RADII, shadows: SHADOWS },
    });
    const radiiSection = container.querySelectorAll('section')[2] as HTMLElement;
    ['none', 'sm', 'md', 'lg', 'xl', 'full'].forEach(k => {
      expect(within(radiiSection).getByText(k)).toBeTruthy();
    });
  });

  it('omite las sombras con valor "none"', () => {
    const { container } = render(BrandPreview, {
      props: { colors: COLORS, typography: TYPOGRAPHY, radii: RADII, shadows: SHADOWS },
    });
    // sm y md tienen sombra real, lg es 'none' y se omite
    const shadowsSection = container.querySelectorAll('section')[3] as HTMLElement;
    expect(within(shadowsSection).getByText('sm')).toBeTruthy();
    expect(within(shadowsSection).getByText('md')).toBeTruthy();
    expect(within(shadowsSection).queryByText('lg')).toBeFalsy();
  });
});

describe('BrandPreview — objetos vacíos o mínimos', () => {
  it('no rompe con colors, radii y shadows vacíos', () => {
    const { container } = render(BrandPreview, {
      props: { colors: {}, typography: TYPOGRAPHY, radii: {}, shadows: {} },
    });
    expect(container.querySelectorAll('[title]').length).toBe(0);
  });

  it('radii vacío cae en el default "0px" para cada clave', () => {
    const { container } = render(BrandPreview, {
      props: { colors: {}, typography: TYPOGRAPHY, radii: {}, shadows: {} },
    });
    const swatches = container.querySelectorAll('.border-faint.bg-surface-muted-strong');
    expect(swatches.length).toBe(6);
    swatches.forEach(s => {
      expect((s as HTMLElement).style.borderRadius).toBe('0px');
    });
  });

  it('shadows vacío no renderiza ningún swatch de sombra', () => {
    const { container } = render(BrandPreview, {
      props: { colors: {}, typography: TYPOGRAPHY, radii: {}, shadows: {} },
    });
    const shadowsSection = container.querySelectorAll('section')[3] as HTMLElement;
    expect(within(shadowsSection).queryByText('sm')).toBeFalsy();
    expect(within(shadowsSection).queryByText('md')).toBeFalsy();
  });
});
