import { z } from 'zod/v4';
import { OptionalHeadingSchema, LinkSchema } from '../shared/schemas';

export const FaqPropsSchema = z.object({
  heading: OptionalHeadingSchema,
  items:   z.array(z.object({
    question: z.string(),
    answer:   z.string(),
  })).min(1),
});

export const PricingPropsSchema = z.object({
  heading: OptionalHeadingSchema,
  plans:   z.array(z.object({
    name:        z.string(),
    price:       z.string(),
    period:      z.string().optional(),
    description: z.string().optional(),
    features:    z.array(z.string()),
    ctaLabel:    z.string(),
    ctaHref:     z.string(),
    highlighted: z.boolean().default(false),
  })).min(1),
});

const CountdownPhaseConfigSchema = z.object({
  title:       z.string(),
  description: z.string(),
  cta:         LinkSchema,
});

export const CountdownPropsSchema = z.object({
  targetDate: z.string().nullable().default(null),
  duration:   z.number().int().min(1).default(3),
  heading:    OptionalHeadingSchema,
  imageUrl:   z.string().optional(),
  imageAlt:   z.string().optional(),
  phases: z.object({
    pending:  CountdownPhaseConfigSchema,
    upcoming: CountdownPhaseConfigSchema,
    live:     CountdownPhaseConfigSchema,
    finished: CountdownPhaseConfigSchema,
  }),
});

export type FaqProps      = z.infer<typeof FaqPropsSchema>;
export type PricingProps   = z.infer<typeof PricingPropsSchema>;
export type CountdownProps = z.infer<typeof CountdownPropsSchema>;
export type CountdownPhaseConfig = z.infer<typeof CountdownPhaseConfigSchema>;
