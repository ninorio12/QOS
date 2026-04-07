import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../config', () => ({
  config: {
    twilio: {
      accountSid: 'ACtest123',
      authToken:  'auth-token-test',
      fromNumber: '+33100000000',
    },
  },
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('sendSMS', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs to Twilio API with correct credentials and body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sid: 'SM123', status: 'queued' }),
    })

    const { sendSMS } = await import('./twilio')
    const result = await sendSMS('+33612345678', 'Bonjour Jean, je suis Kai...')

    expect(result.sid).toBe('SM123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/ACtest123/Messages.json',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.stringContaining('Basic '),
          'Content-Type': 'application/x-www-form-urlencoded',
        }),
      })
    )
  })

  it('throws when Twilio API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'The number is unverified' }),
    })

    const { sendSMS } = await import('./twilio')
    await expect(sendSMS('+33600000000', 'test')).rejects.toThrow('Twilio SMS error: 400')
  })
})
