export interface LeBonCoinListing {
  title: string
  price: number
  url: string
  location?: string
}

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

/**
 * Search LeBonCoin by scraping the HTML search page.
 * Extracts listing data from the embedded __NEXT_DATA__ JSON.
 * Returns [] on any failure (fail graceful).
 */
export async function searchLeBonCoin(
  query: string,
  limit: number = 10
): Promise<LeBonCoinListing[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const searchUrl = `https://www.leboncoin.fr/recherche?text=${encodeURIComponent(query)}&owner_type=private`

    console.log(`[LeBonCoin] Fetching: ${searchUrl}`)

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: 'follow',
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
      console.warn('[LeBonCoin] Search timed out (8s)')
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
