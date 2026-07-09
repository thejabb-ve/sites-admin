import { z } from 'zod/v4';

export const CtaPropsSchema = z.object({
  label:   z.string(),
  href:    z.string(),
  variant: z.enum(['primary', 'secondary', 'ghost']).default('primary'),
});

export type CtaProps = z.infer<typeof CtaPropsSchema>;
