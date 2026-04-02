export interface LeBonCoinListing {
  title: string
  price: number
  url: string
  location?: string
}

/**
 * Search for LeBonCoin market prices via Google search.
 * Uses ScraperAPI (basic proxy, 1 credit/request) to search Google
 * for "site:leboncoin.fr <query>" and extracts prices from snippets.
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

    const googleQuery = `site:leboncoin.fr ${query}`
    const googleUrl = `https://www.google.fr/search?q=${encodeURIComponent(googleQuery)}&num=20&hl=fr`
    const scraperUrl = `https://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodeURIComponent(googleUrl)}&autoparse=true`

    console.log(`[LeBonCoin] Fetching via Google+ScraperAPI: "${query}"`)

    const response = await fetch(scraperUrl, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.warn(`[LeBonCoin] Google fetch failed: ${response.status}`)
      return []
    }

    const data = await response.json()
    const results = data.organic_results || []

    if (results.length === 0) {
      console.warn('[LeBonCoin] No Google results found')
      return []
    }

    // Extract prices from snippets and titles
    const listings: LeBonCoinListing[] = []
    const priceRegex = /(\d[\d\s,.]*)\s*€/g

    for (const result of results) {
      const text = `${result.title || ''} ${result.snippet || ''}`
      const url = result.link || ''

      // Skip category/search pages, only want actual listings or pages with prices
      let match
      priceRegex.lastIndex = 0
      while ((match = priceRegex.exec(text)) !== null) {
        const price = parseInt(match[1].replace(/[\s,.]/g, ''))
        if (price > 0 && price < 50000) {
          // Extract a title from the Google result
          const title = (result.title || '').replace(/\s*-\s*leboncoin.*$/i, '').replace(/d'occasion.*$/i, '').trim()

          listings.push({
            title: title || query,
            price,
            url: url.startsWith('http') ? url : `https://www.leboncoin.fr`,
            location: '',
          })
        }
      }
    }

    // Deduplicate by price (keep first occurrence)
    const seen = new Set<number>()
    const unique = listings.filter(l => {
      if (seen.has(l.price)) return false
      seen.add(l.price)
      return true
    })

    console.log(`[LeBonCoin] Extracted ${unique.length} price points from Google results`)
    return unique.slice(0, limit)
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('[LeBonCoin] Search timed out (30s)')
    } else {
      console.warn(`[LeBonCoin] Search error: ${err.message}`)
    }
    return []
  }
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
