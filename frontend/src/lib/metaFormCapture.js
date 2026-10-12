const META_NOTE_PREFIXES = [
  'FB Leadgen:',
  'FB Campaign:',
  'FB Adset:',
  'FB Ad:',
  'FB Form:',
  'FB Form ID:',
  'FB Ad ID:',
  'FB Page:',
  'Landing:',
  'NOTE:',
  'WARNING:',
];

function isMetaHeaderLine(line = '') {
  const t = String(line).trim();
  return META_NOTE_PREFIXES.some((p) => t.startsWith(p));
}

function parseMetaValueLine(line = '', prefix) {
  const t = String(line).trim();
  if (!t.startsWith(prefix)) return '';
  return t.slice(prefix.length).trim();
}

/**
 * Reconstruct Meta form capture from legacy `lead.notes` (pre-structured storage).
 */
export function parseMetaFormFromNotes(notes = '') {
  const text = String(notes || '').trim();
  if (!text || !/FB Leadgen:/i.test(text)) return null;

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const capture = {
    provider: 'facebook_leadgen',
    leadgenId: '',
    campaignName: '',
    adsetName: '',
    adName: '',
    formName: '',
    formId: '',
    adId: '',
    pageId: '',
    answers: [],
  };

  for (const line of lines) {
    if (line.startsWith('FB Leadgen:')) capture.leadgenId = parseMetaValueLine(line, 'FB Leadgen:');
    else if (line.startsWith('FB Campaign:')) capture.campaignName = parseMetaValueLine(line, 'FB Campaign:');
    else if (line.startsWith('FB Adset:')) capture.adsetName = parseMetaValueLine(line, 'FB Adset:');
    else if (line.startsWith('FB Ad:')) capture.adName = parseMetaValueLine(line, 'FB Ad:');
    else if (line.startsWith('FB Form ID:')) capture.formId = parseMetaValueLine(line, 'FB Form ID:');
    else if (line.startsWith('FB Form:')) capture.formName = parseMetaValueLine(line, 'FB Form:');
    else if (line.startsWith('FB Ad ID:')) capture.adId = parseMetaValueLine(line, 'FB Ad ID:');
    else if (line.startsWith('FB Page:')) capture.pageId = parseMetaValueLine(line, 'FB Page:');
    else if (isMetaHeaderLine(line)) {
      // skip NOTE / WARNING / Landing duplicate
    } else {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const label = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (label && value) {
          capture.answers.push({ key: label, label, value });
        }
      }
    }
  }

  if (!capture.answers.length && !capture.leadgenId) return null;
  return capture;
}

export function resolveMetaFormCapture(lead) {
  const stored = lead?.externalFormCapture;
  if (stored?.answers?.length) return stored;
  if (stored?.leadgenId || stored?.campaignName || stored?.formName) return stored;

  const isMeta =
    String(lead?.externalLeadSource || '').includes('facebook') ||
    String(lead?.channel || '').toLowerCase() === 'facebook' ||
    String(lead?.captureType || '').includes('facebook');

  if (!isMeta && !String(lead?.notes || '').includes('FB Leadgen:')) {
    return null;
  }

  return parseMetaFormFromNotes(lead?.notes) || (stored?.answers ? stored : null);
}
