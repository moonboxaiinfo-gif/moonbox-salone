import { describe, expect, it } from 'vitest';
import { LandingPageService } from './landingPageService';

describe('LandingPageService', () => {
  it('generates a normalized WhatsApp URL only for valid international numbers', () => {
    expect(LandingPageService.whatsappUrl('+94 77 123 4567', 'Hello there')).toBe('https://wa.me/94771234567?text=Hello%20there');
    expect(LandingPageService.whatsappUrl('123', 'Hello')).toBeNull();
  });

  it('validates required published content fields', () => {
    const draft = LandingPageService.getDraft();
    expect(LandingPageService.validate(draft)).toEqual([]);
    expect(LandingPageService.validate({ ...draft, hero: { ...draft.hero, heading: '' } })).toContain('Hero heading is required.');
  });

  it('keeps a published fallback available when no draft exists', () => {
    const published = LandingPageService.getPublished();
    expect(published.general.brandName).toBe('Moonbox Salon');
    expect(published.gallery.length).toBeGreaterThan(0);
  });
});
