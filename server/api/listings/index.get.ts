import { desc, or, like } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { listings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.q as string)?.trim()

  const db = useDB()

  let rows
  if (search) {
    const pattern = `%${search}%`
    rows = await db
      .select()
      .from(listings)
      .where(or(like(listings.title, pattern), like(listings.description, pattern)))
      .orderBy(desc(listings.createdAt))
  } else {
    rows = await db.select().from(listings).orderBy(desc(listings.createdAt))
  }

  const parsed = rows.map((row) => ({
    ...row,
    marketData: row.marketData ? JSON.parse(row.marketData) : null,
    aiStats: row.aiStats ? JSON.parse(row.aiStats) : null,
  }))

  return { listings: parsed }
})
