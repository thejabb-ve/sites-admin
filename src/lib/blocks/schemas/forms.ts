import { z } from 'zod/v4';

const SAFE_FIELD_NAME = /^[a-z][a-z0-9_]*$/;

export const FormFieldSchema = z.object({
  name:     z.string().refine((v) => SAFE_FIELD_NAME.test(v), {
    error: 'El nombre del campo solo puede contener letras minúsculas, números y guiones bajos',
  }),
  type:     z.enum(['text', 'email', 'textarea', 'select', 'checkbox', 'file']),
  label:    z.string(),
  required: z.boolean().default(false),
  options:  z.array(z.string()).optional(),
});

export const FormPropsSchema = z.object({
  heading:           z.string().optional(),
  fields:            z.array(FormFieldSchema).min(1),
  submitLabel:       z.string().default('Enviar'),
  action:            z.string().regex(/^[a-z][a-z0-9_-]*$/, {
    error: 'action solo puede contener letras minúsculas, números, guiones y guiones bajos',
  }),
  errorMessage:      z.string().default('Error al enviar el formulario.'),
  networkError:      z.string().default('No se pudo conectar con el servidor.'),
  successMessage:    z.string().default('¡Mensaje enviado con éxito! Te responderemos pronto.'),
  selectPlaceholder: z.string().default('Seleccionar...'),
  submittingLabel:   z.string().default('Enviando…'),
});

export type FormProps  = z.infer<typeof FormPropsSchema>;
export type FormField  = z.infer<typeof FormFieldSchema>;
