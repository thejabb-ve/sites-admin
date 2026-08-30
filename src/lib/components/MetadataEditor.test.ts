import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import MetadataEditor from './MetadataEditor.svelte';

describe('MetadataEditor — renderizado', () => {
  it('renderiza los campos de metadata con sus valores iniciales', () => {
    render(MetadataEditor, {
      props: {
        seoTitle:       'Mi título',
        seoDescription: 'Mi descripción',
        robots:         'index, follow',
        ogTitle:        'OG título',
        ogDescription:  'OG descripción',
        ogImageUrl:     'https://cdn.test/og.jpg',
        canonicalUrl:   '',
      },
    });

    expect((document.getElementById('seo_title') as HTMLInputElement).value).toBe('Mi título');
    expect((document.getElementById('seo_description') as HTMLTextAreaElement).value).toBe('Mi descripción');
    expect((document.getElementById('robots') as HTMLSelectElement).value).toBe('index, follow');
    expect((document.getElementById('og_title') as HTMLInputElement).value).toBe('OG título');
    expect((document.getElementById('og_description') as HTMLTextAreaElement).value).toBe('OG descripción');
    expect((document.getElementById('og_image_url') as HTMLInputElement).value).toBe('https://cdn.test/og.jpg');
  });

  it('muestra el placeholder por defecto cuando el título SEO está vacío', () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    expect(screen.getByText('(Sin título SEO)')).toBeTruthy();
    expect(screen.getByText('(Sin descripción)')).toBeTruthy();
  });

  it('muestra el contador de caracteres del título SEO', () => {
    render(MetadataEditor, {
      props: {
        seoTitle: 'Hola', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    expect(screen.getByText('4 / 70')).toBeTruthy();
  });

  it('no muestra el input de URL canónica personalizada si canonicalUrl está vacío', () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    expect(document.querySelector('input[name="canonical_url"][type="url"]')).toBeFalsy();
    expect(document.querySelector('input[name="canonical_url"][type="hidden"]')).toBeTruthy();
  });

  it('muestra el input de URL canónica si canonicalUrl ya tiene valor', () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: 'https://ejemplo.com/original',
      },
    });
    const input = document.querySelector('input[name="canonical_url"][type="url"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('https://ejemplo.com/original');
  });
});

describe('MetadataEditor — interacción', () => {
  it('escribir en el título SEO actualiza el valor del input', async () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    const input = document.getElementById('seo_title') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Nuevo título SEO' } });
    expect(input.value).toBe('Nuevo título SEO');
  });

  it('escribir en el título SEO actualiza la previsualización de Google', async () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    const input = document.getElementById('seo_title') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Título de prueba' } });
    expect(screen.getByText('Título de prueba')).toBeTruthy();
  });

  it('escribir en la descripción SEO actualiza el contador de caracteres', async () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    const textarea = document.getElementById('seo_description') as HTMLTextAreaElement;
    await fireEvent.input(textarea, { target: { value: 'Una descripción de prueba' } });
    expect(screen.getByText('25 / 160')).toBeTruthy();
  });

  it('cambiar el select de robots actualiza su valor', async () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    const select = document.getElementById('robots') as HTMLSelectElement;
    await fireEvent.change(select, { target: { value: 'noindex, follow' } });
    expect(select.value).toBe('noindex, follow');
  });

  it('marcar el checkbox de URL canónica muestra el input correspondiente', async () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(document.querySelector('input[name="canonical_url"][type="url"]')).toBeFalsy();

    checkbox.checked = true;
    await fireEvent.change(checkbox);

    expect(document.querySelector('input[name="canonical_url"][type="url"]')).toBeTruthy();
  });

  it('escribir en el título OG actualiza su valor', async () => {
    render(MetadataEditor, {
      props: {
        seoTitle: '', seoDescription: '', robots: 'index, follow',
        ogTitle: '', ogDescription: '', ogImageUrl: '', canonicalUrl: '',
      },
    });
    const input = document.getElementById('og_title') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Título para redes' } });
    expect(input.value).toBe('Título para redes');
  });
});
