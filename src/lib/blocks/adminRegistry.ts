import type { ZodType }       from 'zod/v4';
import type { FieldInputType } from './schemaToFields';

import { HeroCenteredPropsSchema, HeroSplitPropsSchema }          from './schemas/heros';
import { HeaderPropsSchema, FooterPropsSchema }                    from './schemas/navigation';
import { RichTextPropsSchema }                                     from './schemas/text';
import { GalleryPropsSchema }                                      from './schemas/media';
import { FeatureGridPropsSchema }                                  from './schemas/grids';
import { FaqPropsSchema, PricingPropsSchema, CountdownPropsSchema } from './schemas/interactive';
import { FormPropsSchema }                                         from './schemas/forms';
import { CtaPropsSchema }                                          from './schemas/ctas';

/**
 * scope:
 *  'page'     (default) — bloque normal añadible por página
 *  'site'     — configuración global del sitio (header, footer); gestionado desde Settings
 *  'embedded' — solo puede existir como hijo de otro bloque (countdown)
 */
export type BlockScope = 'page' | 'site' | 'embedded';

export interface AdminBlockEntry {
  label:           string;
  defaultProps:    Record<string, unknown>;
  schema:          ZodType;
  scope?:          BlockScope;
  /** Sobreescribe el tipo de input para campos específicos */
  fieldOverrides?: Record<string, { inputType: FieldInputType }>;
  /** Etiquetas legibles para campos específicos (reemplaza la key en la UI) */
  fieldLabels?:    Record<string, string>;
}

export const ADMIN_BLOCK_REGISTRY: Record<string, AdminBlockEntry> = {
  'hero': {
    label: 'Hero centrado',
    defaultProps: { heading: 'Título principal', subheading: '', ctaLabel: '', ctaHref: '' },
    schema: HeroCenteredPropsSchema,
  },
  'hero-split': {
    label: 'Hero (imagen lateral)',
    defaultProps: { heading: 'Título principal', imageUrl: '', imageAlt: '', reversed: false },
    schema: HeroSplitPropsSchema,
  },
  'header': {
    label: 'Encabezado (navegación)',
    scope: 'site',
    defaultProps: { links: [], ctaLabel: '', ctaHref: '' },
    schema: HeaderPropsSchema,
  },
  'footer': {
    label: 'Pie de página',
    scope: 'site',
    defaultProps: { columns: [], legal: '' },
    schema: FooterPropsSchema,
  },
  'richText': {
    label: 'Texto enriquecido',
    defaultProps: { content: '## Título\n\nEscribe aquí tu contenido en **Markdown**.' },
    schema: RichTextPropsSchema,
    fieldOverrides: { content: { inputType: 'textarea' } },
  },
  'gallery': {
    label: 'Galería de imágenes',
    defaultProps: { images: [{ src: '', alt: '' }], columns: 3 },
    schema: GalleryPropsSchema,
  },
  'featureGrid': {
    label: 'Grid de características',
    defaultProps: { features: [{ title: '', description: '' }], columns: 3 },
    schema: FeatureGridPropsSchema,
  },
  'faq': {
    label: 'Preguntas frecuentes',
    defaultProps: { items: [{ question: '', answer: '' }] },
    schema: FaqPropsSchema,
  },
  'pricing': {
    label: 'Planes de precios',
    defaultProps: {
      plans: [{ name: '', price: '', features: [], ctaLabel: 'Comenzar', ctaHref: '', highlighted: false }],
    },
    schema: PricingPropsSchema,
  },
  'countdown': {
    label: 'Hero — Cuenta regresiva',
    fieldLabels: { duration: 'Días de aviso previo al evento' },
    defaultProps: {
      targetDate: null,
      duration:   3,
      phases: {
        pending:  { title: 'Próximamente', description: 'Prepárate para lo que viene.', cta: { label: '', href: '' } },
        upcoming: { title: 'Ya casi',      description: '¡Faltan pocos días!',         cta: { label: 'Ver detalles', href: '#' } },
        live:     { title: '¡Ya está aquí!', description: 'No te lo pierdas.',         cta: { label: 'Participar', href: '#' } },
        finished: { title: 'Terminó',      description: 'Gracias por participar.',     cta: { label: '', href: '' } },
      },
    },
    schema: CountdownPropsSchema,
  },
  'form': {
    label: 'Formulario de contacto',
    defaultProps: {
      fields:            [{ name: 'nombre', type: 'text', label: 'Nombre', required: true }],
      submitLabel:       'Enviar',
      action:            'contacto',
      errorMessage:      'Error al enviar el formulario.',
      networkError:      'No se pudo conectar con el servidor.',
      successMessage:    '¡Mensaje enviado con éxito! Te responderemos pronto.',
      selectPlaceholder: 'Seleccionar...',
      submittingLabel:   'Enviando…',
    },
    schema: FormPropsSchema,
  },
  'cta': {
    label: 'Llamada a la acción (CTA)',
    defaultProps: { label: 'Comenzar ahora', href: '/', variant: 'primary' },
    schema: CtaPropsSchema,
  },
};
