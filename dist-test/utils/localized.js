"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalizedText = getLocalizedText;
/**
 * Resolve bilingual JSON fields ({ en, am }) or plain strings for emails and notifications.
 */
function getLocalizedText(value, lang = 'en') {
    if (typeof value === 'string')
        return value;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value;
        const preferred = record[lang];
        if (typeof preferred === 'string' && preferred.trim())
            return preferred;
        if (typeof record.en === 'string' && record.en.trim())
            return record.en;
        if (typeof record.am === 'string' && record.am.trim())
            return record.am;
        const first = Object.values(record).find((v) => typeof v === 'string' && v.trim());
        return typeof first === 'string' ? first : '';
    }
    return '';
}
