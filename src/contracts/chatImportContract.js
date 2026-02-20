export const APP_IDS = ['whatsapp', 'imessage', 'telegram', 'instagram', 'messenger', 'snapchat']

export const APP_LABELS = {
  whatsapp: 'WhatsApp',
  imessage: 'iMessage',
  telegram: 'Telegram',
  instagram: 'Instagram',
  messenger: 'Messenger',
  snapchat: 'Snapchat',
}

export const IMPORT_MODE_CONFIG = {
  whatsapp: { file: true, paste: true, acceptedExtensions: ['txt'] },
  imessage: { file: true, paste: true, acceptedExtensions: ['csv', 'txt', 'json'] },
  telegram: { file: true, paste: true, acceptedExtensions: ['json', 'zip', 'html'] },
  instagram: { file: true, paste: true, acceptedExtensions: ['json', 'zip'] },
  messenger: { file: true, paste: true, acceptedExtensions: ['json', 'zip'] },
  snapchat: { file: true, paste: true, acceptedExtensions: ['json', 'zip'] },
}

export const MAX_IMPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const MIN_MESSAGES_FOR_ANALYSIS = 20
export const PREVIEW_SAMPLE_SIZE = 20

export function createEmptyImportResult() {
  return {
    participants: [],
    messages: [],
    stats: {
      messageCount: 0,
      participantCount: 0,
      startDateISO: null,
      endDateISO: null,
      estimatedDays: 0,
      languageHint: null,
    },
    warnings: [],
    sample: [],
  }
}
