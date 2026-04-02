import { eq } from 'drizzle-orm'
import { useDB } from '../../database'
import { listings } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  const db = useDB()
  const [row] = await db.select().from(listings).where(eq(listings.id, id))

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Annonce non trouvee' })
  }

  return {
    listing: {
      ...row,
      marketData: row.marketData ? JSON.parse(row.marketData) : null,
      aiStats: row.aiStats ? JSON.parse(row.aiStats) : null,
    },
  }
})
