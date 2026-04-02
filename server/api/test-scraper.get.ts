import { searchLeBonCoin, computePriceStats } from '../utils/leboncoin'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const search = (query.q as string) || 'table basse bois'

  const hasKey = !!config.scraperApiKey
  const keyPreview = hasKey ? config.scraperApiKey.slice(0, 6) + '...' : 'MISSING'

  console.log(`[test-scraper] scraperApiKey present: ${hasKey}, preview: ${keyPreview}`)
  console.log(`[test-scraper] Searching for: "${search}"`)

  const startMs = Date.now()

  try {
    const listings = await searchLeBonCoin(search, config.scraperApiKey, 10)
    const stats = computePriceStats(listings)
    const durationMs = Date.now() - startMs

    return {
      success: true,
      keyPresent: hasKey,
      keyPreview,
      query: search,
      durationMs,
      listingsCount: listings.length,
      stats,
      listings: listings.slice(0, 5),
    }
  } catch (e: any) {
    return {
      success: false,
      keyPresent: hasKey,
      keyPreview,
      query: search,
      durationMs: Date.now() - startMs,
      error: e.message || String(e),
    }
  }
})
