import { searchLeBonCoin, computePriceStats } from '../utils/leboncoin'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const search = (query.q as string) || 'table basse bois'

  const startMs = Date.now()

  try {
    const listings = await searchLeBonCoin(search, config.scraperApiKey, 15)
    const stats = computePriceStats(listings)

    return {
      success: true,
      query: search,
      durationMs: Date.now() - startMs,
      listingsCount: listings.length,
      stats,
      listings: listings.slice(0, 8),
    }
  } catch (e: any) {
    return {
      success: false,
      query: search,
      durationMs: Date.now() - startMs,
      error: e.message || String(e),
    }
  }
})
