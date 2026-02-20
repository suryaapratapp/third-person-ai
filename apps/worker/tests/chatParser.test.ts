import AdmZip from 'adm-zip'
import { describe, expect, it } from 'vitest'
import { parseImportFile } from '../src/services/chatParser'

function parseFromText(sourceApp: string, fileName: string, text: string) {
  return parseImportFile({
    sourceApp,
    filePath: fileName,
    fileBuffer: Buffer.from(text, 'utf-8'),
  })
}

describe('chat parser', () => {
  it('parses WhatsApp 12h/24h variants, missing bracket spacing, multiline and system lines', () => {
    const sample = [
      '[10/02/2026, 01:21 PM]Alex: First line',
      'continuation line',
      '[10/02/2026, 13:25:10] Jordan: Reply',
      '[10/02/2026, 13:30:00] Messages are end-to-end encrypted.',
      'Random heading line to ignore',
      '[10/02/2026, 13:45] Alex: Final line',
    ].join('\n')

    const parsed = parseFromText('whatsapp', 'chat.txt', sample)

    expect(parsed.dbMessages.length).toBeGreaterThanOrEqual(4)
    expect(parsed.dbMessages[0].text).toContain('continuation line')
    expect(parsed.report.ignoredCount).toBeGreaterThanOrEqual(0)
    expect(parsed.report.detectedFormat).toBe('whatsapp_txt')
  })

  it('parses Telegram JSON where text can be string or rich text array', () => {
    const sample = JSON.stringify({
      messages: [
        { id: 1, from: 'Alex', date: '2026-02-10T10:00:00Z', text: 'Hello there' },
        {
          id: 2,
          from: 'Jordan',
          date_unixtime: '1770003600',
          text: ['Rich ', { type: 'bold', text: 'text' }, ' payload'],
        },
        { id: 3, from: 'Alex', date: '2026-02-10T10:10:00Z', text: 'Third message' },
      ],
    })

    const parsed = parseFromText('telegram', 'result.json', sample)

    expect(parsed.dbMessages.length).toBe(3)
    expect(parsed.dbMessages.map((item) => item.text).join(' ')).toContain('Rich text payload')
    expect(parsed.report.detectedFormat).toBe('telegram_json')
  })

  it('parses Telegram HTML export messages', () => {
    const html = `
      <html><body>
        <div class="message default clearfix">
          <div class="from_name">Alex</div>
          <div class="date" title="2026-02-10 10:00:00 UTC"></div>
          <div class="text">Hello from HTML</div>
        </div>
        <div class="message default clearfix">
          <div class="from_name">Jordan</div>
          <div class="date" title="2026-02-10 10:01:00 UTC"></div>
          <div class="text">Reply line</div>
        </div>
        <div class="message default clearfix">
          <div class="from_name">Alex</div>
          <div class="date" title="2026-02-10 10:02:00 UTC"></div>
          <div class="text">Third line</div>
        </div>
      </body></html>
    `

    const parsed = parseFromText('telegram', 'export.html', html)

    expect(parsed.dbMessages.length).toBe(3)
    expect(parsed.dbMessages[0].sender).toBe('Alex')
    expect(parsed.report.detectedFormat).toBe('telegram_html')
  })

  it('parses Meta message_1.json with text and attachment-only messages', () => {
    const sample = JSON.stringify({
      messages: [
        { sender_name: 'Alex', timestamp_ms: 1770000000000, content: 'Hi' },
        { sender_name: 'Jordan', timestamp_ms: 1770001000000, photos: [{ uri: 'p.jpg' }] },
        { sender_name: 'Alex', timestamp_ms: 1770002000000, content: 'How are you?' },
      ],
    })

    const parsed = parseFromText('messenger', 'message_1.json', sample)

    expect(parsed.dbMessages.length).toBe(3)
    expect(parsed.dbMessages[1].text).toContain('Media attachment')
    expect(parsed.report.detectedFormat).toBe('meta_messages_json')
  })

  it('parses Snapchat chat_history.json best effort', () => {
    const sample = JSON.stringify({
      chat_history: [
        { sender: 'alex_user', timestamp: '2026-02-01T10:10:10Z', content: 'Hey' },
        { sender: 'jordan_user', timestamp_ms: 1770003000000, chat_message: 'Reply' },
        { sender: 'alex_user', created_at: '2026-02-01T10:12:10Z', message: 'Wrap up' },
      ],
    })

    const parsed = parseFromText('snapchat', 'chat_history.json', sample)

    expect(parsed.dbMessages.length).toBeGreaterThanOrEqual(3)
    expect(parsed.report.detectedFormat).toBe('snapchat_json')
  })

  it('parses iMessage CSV with auto-detected columns', () => {
    const csv = [
      'datetime,contact,body',
      '2026-02-01 10:00:00,Alex,Hey there',
      '2026-02-01 10:05:00,Jordan,All good',
      '2026-02-01 10:09:00,Alex,Great',
    ].join('\n')

    const parsed = parseFromText('imessage', 'imessage.csv', csv)

    expect(parsed.dbMessages.length).toBe(3)
    expect(parsed.report.detectedFormat).toBe('imessage_csv')
  })

  it('parses Meta ZIP exports by selecting the largest thread', () => {
    const zip = new AdmZip()
    zip.addFile(
      'messages/inbox/thread_a/message_1.json',
      Buffer.from(
        JSON.stringify({
          messages: [
            { sender_name: 'A', timestamp_ms: 1770000000000, content: 'A1' },
            { sender_name: 'B', timestamp_ms: 1770000001000, content: 'A2' },
          ],
        }),
      ),
    )
    zip.addFile(
      'messages/inbox/thread_b/message_1.json',
      Buffer.from(
        JSON.stringify({
          messages: [
            { sender_name: 'A', timestamp_ms: 1770000000000, content: 'B1' },
            { sender_name: 'B', timestamp_ms: 1770000001000, content: 'B2' },
            { sender_name: 'A', timestamp_ms: 1770000002000, content: 'B3' },
          ],
        }),
      ),
    )

    const parsed = parseImportFile({
      sourceApp: 'messenger',
      filePath: 'export.zip',
      fileBuffer: zip.toBuffer(),
    })

    expect(parsed.dbMessages.length).toBe(3)
    expect(parsed.report.selectedThread).toContain('thread_b')
    expect(parsed.report.warnings.join(' ')).toContain('Auto-selected')
  })
})
