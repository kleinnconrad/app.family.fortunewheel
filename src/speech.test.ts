import { describe, expect, it } from 'vitest';
import { pickGermanVoice } from './speech';

const voice = (name: string, lang: string, isDefault = false) => ({ name, lang, default: isDefault });

describe('pickGermanVoice', () => {
  it('returns null when no German voice is installed', () => {
    expect(pickGermanVoice([voice('Samantha', 'en-US', true)])).toBeNull();
  });

  it('prefers de-DE over other German variants', () => {
    const picked = pickGermanVoice([voice('Swiss', 'de-CH'), voice('Anna', 'de-DE'), voice('Alex', 'en-US')]);
    expect(picked?.name).toBe('Anna');
  });

  it('prefers natural-sounding voices', () => {
    const picked = pickGermanVoice([voice('Anna', 'de-DE'), voice('Microsoft Katja Online (Natural)', 'de-DE')]);
    expect(picked?.name).toBe('Microsoft Katja Online (Natural)');
  });

  it('understands underscore language tags used by some Android browsers', () => {
    expect(pickGermanVoice([voice('Deutsch', 'de_DE')])?.name).toBe('Deutsch');
  });
});
