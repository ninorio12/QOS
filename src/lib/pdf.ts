// PDF generation that works both locally and on Vercel serverless.
// Vercel: puppeteer-core + @sparticuz/chromium (no bundled Chrome).
// Local dev: full puppeteer with its downloaded Chrome.

const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_VERSION || !!process.env.VERCEL

export async function generatePdfBuffer(html: string): Promise<Buffer> {
  let browser: { newPage: () => Promise<unknown>; close: () => Promise<void> } & Record<string, unknown>

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = await import('puppeteer-core')
    // Load the Chromium brotli pack from a remote URL (the bin folder isn't bundled by Vercel)
    const remotePack = 'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.tar'
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(remotePack),
      headless: true,
    }) as never
  } else {
    const puppeteer = (await import('puppeteer')).default
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }) as never
  }

  try {
    const page = await browser.newPage() as {
      setContent: (h: string, o: object) => Promise<void>
      pdf: (o: object) => Promise<Uint8Array>
    }
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
