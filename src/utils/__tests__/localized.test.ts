import { getLocalizedText } from '../localized';

describe('getLocalizedText', () => {
  it('returns plain strings unchanged', () => {
    expect(getLocalizedText('Cozy Studio')).toBe('Cozy Studio');
  });

  it('prefers the requested language', () => {
    expect(getLocalizedText({ en: 'Bole Apartment', am: 'ቦሌ አፓርትመንት' }, 'en')).toBe(
      'Bole Apartment'
    );
  });

  it('falls back to en then am', () => {
    expect(getLocalizedText({ am: 'አድራሻ' })).toBe('አድራሻ');
  });

  it('returns empty string for invalid values', () => {
    expect(getLocalizedText(null)).toBe('');
    expect(getLocalizedText({})).toBe('');
  });
});
