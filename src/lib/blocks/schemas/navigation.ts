import { z } from 'zod/v4';

const SubNavLinkSchema = z.object({
  label: z.string(),
  href:  z.string(),
});

const NavLinkSchema = z.object({
  label:    z.string(),
  href:     z.string(),
  external: z.boolean().optional(),
  subMenu:  z.array(SubNavLinkSchema).optional(),
});

export const HeaderPropsSchema = z.object({
  logo:     z.string().optional(),
  links:    z.array(NavLinkSchema).default([]),
  ctaLabel: z.string().optional(),
  ctaHref:  z.string().optional(),
});

const FooterColumnSchema = z.object({
  heading: z.string(),
  links:   z.array(NavLinkSchema),
});

export const FooterPropsSchema = z.object({
  columns:    z.array(FooterColumnSchema).default([]),
  legal:      z.string().optional(),
  address:    z.string().optional(),
  legalLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
  socials:    z.array(z.object({
    platform: z.enum(['twitter', 'instagram', 'linkedin', 'github', 'youtube', 'facebook']),
    href:     z.string(),
  })).optional(),
});

export type HeaderProps = z.infer<typeof HeaderPropsSchema>;
export type FooterProps = z.infer<typeof FooterPropsSchema>;
