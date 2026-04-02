export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const search = (query.q as string) || 'table basse bois'
  const scraperApiKey = config.scraperApiKey

  const hasKey = !!scraperApiKey
  const keyPreview = hasKey ? scraperApiKey.slice(0, 6) + '...' : 'MISSING'
  const startMs = Date.now()

  try {
    const targetUrl = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(search)}&owner_type=private`
    const scraperUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}`

    const response = await fetch(scraperUrl)
    const html = await response.text()
    const durationMs = Date.now() - startMs

    // Diagnostic checks
    const hasNextData = html.includes('__NEXT_DATA__')
    const hasDatadome = html.includes('datadome')
    const hasCaptcha = html.includes('captcha')
    const hasAdsKey = html.includes('"ads"')
    const hasJsonLd = html.includes('application/ld+json')

    // Try extract __NEXT_DATA__
    let nextDataKeys: string[] = []
    let adsCount = 0
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (match) {
      try {
        const data = JSON.parse(match[1])
        const props = data?.props?.pageProps
        nextDataKeys = Object.keys(props || {})
        const ads = props?.searchData?.ads || props?.ads || props?.initialData?.ads || []
        adsCount = Array.isArray(ads) ? ads.length : 0
      } catch (e: any) {
        nextDataKeys = [`PARSE_ERROR: ${e.message}`]
      }
    }

    return {
      keyPresent: hasKey,
      keyPreview,
      query: search,
      durationMs,
      httpStatus: response.status,
      htmlLength: html.length,
      htmlFirst300: html.slice(0, 300),
      diagnostics: {
        hasNextData,
        hasDatadome,
        hasCaptcha,
        hasAdsKey,
        hasJsonLd,
        nextDataKeys,
        adsCount,
      },
    }
  } catch (e: any) {
    return {
      keyPresent: hasKey,
      keyPreview,
      query: search,
      durationMs: Date.now() - startMs,
      error: e.message || String(e),
    }
  }
})
