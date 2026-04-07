import { config } from '../config'

/**
 * transcribeVoice: download a Telegram voice note and transcribe via OpenAI Whisper API
 * @param botToken  - the bot token whose file access is used
 * @param fileId    - Telegram file_id from the voice message
 * @returns transcribed text
 */
export async function transcribeVoice(botToken: string, fileId: string): Promise<string> {
  // Step 1: Get file path from Telegram
  const fileInfoRes = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
  )
  const fileInfo = (await fileInfoRes.json()) as { result: { file_path: string } }
  const filePath = fileInfo.result.file_path

  // Step 2: Download the audio bytes
  const audioRes = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`
  )
  const audioBuffer = await audioRes.arrayBuffer()

  // Step 3: Post to Whisper API
  const form = new FormData()
  form.append('file', new Blob([audioBuffer], { type: 'audio/ogg' }), 'voice.ogg')
  form.append('model', 'whisper-1')
  form.append('language', 'fr')

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${config.openaiKey}` },
    body:    form,
  })

  if (!whisperRes.ok) {
    throw new Error(`Whisper API error: ${whisperRes.status}`)
  }

  const { text } = (await whisperRes.json()) as { text: string }
  return text
}
