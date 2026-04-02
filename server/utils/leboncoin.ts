export interface LeBonCoinListing {
  title: string
  price: number
  url: string
  location?: string
}

/**
 * Search LeBonCoin via ScraperAPI to bypass DataDome anti-bot protection.
 * Extracts listing data from the embedded __NEXT_DATA__ JSON.
 * Returns [] on any failure (fail graceful).
 */
export async function searchLeBonCoin(
  query: string,
  scraperApiKey: string,
  limit: number = 10
): Promise<LeBonCoinListing[]> {
  try {
    if (!scraperApiKey) {
      console.warn('[LeBonCoin] SCRAPER_API_KEY not configured, skipping market search')
      return []
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const targetUrl = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(query)}&owner_type=private`
    const scraperUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(targetUrl)}&ultra_premium=true`

    console.log(`[LeBonCoin] Fetching via ScraperAPI: ${targetUrl}`)

    const response = await fetch(scraperUrl, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.warn(`[LeBonCoin] HTML fetch failed: ${response.status}`)
      return []
    }

    const html = await response.text()

    // Strategy 1: Extract from __NEXT_DATA__ (Next.js SSR data)
    let listings = extractFromNextData(html, limit)
    if (listings.length > 0) {
      console.log(`[LeBonCoin] Extracted ${listings.length} listings from __NEXT_DATA__`)
      return listings
    }

    // Strategy 2: Extract from embedded JSON-LD
    listings = extractFromJsonLd(html, limit)
    if (listings.length > 0) {
      console.log(`[LeBonCoin] Extracted ${listings.length} listings from JSON-LD`)
      return listings
    }

    // Strategy 3: Extract from any JSON blob containing ad data
    listings = extractFromInlineJson(html, limit)
    if (listings.length > 0) {
      console.log(`[LeBonCoin] Extracted ${listings.length} listings from inline JSON`)
      return listings
    }

    console.warn(`[LeBonCoin] Could not extract listings from HTML (${html.length} bytes)`)
    // Log a snippet to help debug
    if (html.includes('datadome')) {
      console.warn('[LeBonCoin] DataDome challenge detected in HTML')
    }
    return []
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[LeBonCoin] Search timed out (30s)')
    } else {
      console.warn(`[LeBonCoin] Search error: ${err.message}`)
    }
    return []
  }
}

function extractFromNextData(html: string, limit: number): LeBonCoinListing[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return []

  try {
    const data = JSON.parse(match[1])
    // Navigate the Next.js data structure to find ads
    const props = data?.props?.pageProps
    const ads = props?.searchData?.ads || props?.ads || props?.initialData?.ads || []
    return parseAds(ads, limit)
  } catch {
    return []
  }
}

function extractFromJsonLd(html: string, limit: number): LeBonCoinListing[] {
  const regex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      if (data['@type'] === 'ItemList' && data.itemListElement) {
        return data.itemListElement
          .filter((item: any) => item.offers?.price != null)
          .slice(0, limit)
          .map((item: any) => ({
            title: item.name || '',
            price: Number(item.offers.price),
            url: item.url || '',
            location: '',
          }))
      }
    } catch {
      continue
    }
  }
  return []
}

function extractFromInlineJson(html: string, limit: number): LeBonCoinListing[] {
  // Look for patterns like "ads":[{...}] in any inline script
  const adsMatch = html.match(/"ads"\s*:\s*(\[[\s\S]*?\])\s*[,}]/)
  if (!adsMatch) return []

  try {
    const ads = JSON.parse(adsMatch[1])
    return parseAds(ads, limit)
  } catch {
    return []
  }
}

function parseAds(ads: any[], limit: number): LeBonCoinListing[] {
  if (!Array.isArray(ads) || ads.length === 0) return []

  return ads
    .filter((ad: any) => {
      const price = ad.price ?? ad.price_cents
      return price != null
    })
    .slice(0, limit)
    .map((ad: any) => {
      let price = 0
      if (Array.isArray(ad.price)) {
        price = Number(ad.price[0])
      } else if (ad.price_cents) {
        price = Math.round(Number(ad.price_cents) / 100)
      } else {
        price = Number(ad.price)
      }

      return {
        title: ad.subject || ad.title || ad.name || '',
        price,
        url: ad.url || (ad.list_id ? `https://www.leboncoin.fr/ad/${ad.list_id}` : ''),
        location: ad.location?.city || ad.location?.department_name || ad.location?.name || '',
      }
    })
    .filter((l) => l.price > 0 && l.title)
}

/**
 * Compute price statistics from listings, filtering outliers.
 * Removes prices that are more than 3x the median (likely different products).
 */
export function computePriceStats(listings: LeBonCoinListing[]) {
  if (listings.length === 0) return null

  let prices = listings.map((l) => l.price).sort((a, b) => a - b)

  // Filter outliers: remove prices > 3x median
  if (prices.length >= 3) {
    const rawMedian = prices[Math.floor(prices.length / 2)]
    prices = prices.filter((p) => p <= rawMedian * 3 && p >= rawMedian * 0.15)
  }

  if (prices.length === 0) return null

  const sum = prices.reduce((a, b) => a + b, 0)

  return {
    count: prices.length,
    min: prices[0],
    max: prices[prices.length - 1],
    median: prices[Math.floor(prices.length / 2)],
    average: Math.round(sum / prices.length),
  }
}
