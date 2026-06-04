import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';
import { getLocalizedText } from '../../../utils/localized';

const templatePath = path.join(__dirname, '../../../emails/templates/appointmentRequest.hbs');

function renderAppointmentRequestEmail(variables: Record<string, string>) {
  const source = fs.readFileSync(templatePath, 'utf8');
  return handlebars.compile(source)(variables);
}

describe('appointment request email', () => {
  const sampleProperty = {
    title: { en: 'Bole 2BR Apartment', am: 'ቦሌ 2 አልጋ አፓርትመንት' },
    address: { en: 'Bole, Addis Ababa', am: 'ቦሌ፣ አዲስ አበባ' },
  };

  it('does not render [object Object] for bilingual property fields', () => {
    const html = renderAppointmentRequestEmail({
      ownerFirstName: 'Nebat',
      renterName: 'Nebat Hussen',
      propertyTitle: getLocalizedText(sampleProperty.title),
      propertyAddress: getLocalizedText(sampleProperty.address),
      startsAt: 'Fri, Jun 6, 2026, 10:00 AM',
      endsAt: 'Fri, Jun 6, 2026, 2:00 PM',
    });

    expect(html).not.toContain('[object Object]');
    expect(html).toContain('Bole 2BR Apartment');
    expect(html).toContain('Bole, Addis Ababa');
    expect(html).toContain('Nebat Hussen');
    expect(html).toContain('Fri, Jun 6, 2026, 10:00 AM');
  });

  it('would have shown [object Object] without localization', () => {
    const brokenHtml = renderAppointmentRequestEmail({
      ownerFirstName: 'Nebat',
      renterName: 'Nebat Hussen',
      propertyTitle: String(sampleProperty.title),
      propertyAddress: String(sampleProperty.address),
      startsAt: '2026-06-06T07:00:00.000Z',
      endsAt: '2026-06-06T11:00:00.000Z',
    });

    expect(brokenHtml).toContain('[object Object]');
  });
});
