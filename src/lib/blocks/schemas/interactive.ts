import { z } from 'zod/v4';

export const FaqPropsSchema = z.object({
  heading: z.string().optional(),
  items:   z.array(z.object({
    question: z.string(),
    answer:   z.string(),
  })).min(1),
});

export const PricingPropsSchema = z.object({
  heading: z.string().optional(),
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

const CountdownPhaseSchema = z.object({
  title:       z.string(),
  description: z.string(),
  cta:         z.object({ label: z.string(), href: z.string() }),
});

export const CountdownPropsSchema = z.object({
  targetDate: z.string().nullable().default(null),
  duration:   z.number().int().min(1).default(3),
  heading:    z.string().optional(),
  imageUrl:   z.string().optional(),
  imageAlt:   z.string().optional(),
  phases: z.object({
    pending:  CountdownPhaseSchema,
    upcoming: CountdownPhaseSchema,
    live:     CountdownPhaseSchema,
    finished: CountdownPhaseSchema,
  }),
});

export type FaqProps      = z.infer<typeof FaqPropsSchema>;
export type PricingProps   = z.infer<typeof PricingPropsSchema>;
export type CountdownProps = z.infer<typeof CountdownPropsSchema>;
export type CountdownPhase = z.infer<typeof CountdownPhaseSchema>;
