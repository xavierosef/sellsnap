import { desc, or, like, eq, and } from 'drizzle-orm'
import { useDB } from '../../database'
import { listings } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.q as string)?.trim()
  const status = (query.status as string)?.trim()

  const db = useDB()

  const conditions = []

  if (search) {
    const pattern = `%${search}%`
    conditions.push(or(like(listings.title, pattern), like(listings.description, pattern)))
  }

  if (status) {
    conditions.push(eq(listings.status, status))
  }

  let rows
  if (conditions.length > 0) {
    rows = await db
      .select()
      .from(listings)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
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
