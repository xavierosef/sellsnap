import { eq } from 'drizzle-orm'
import { useDB } from '../../database'
import { listings } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  const body = await readBody(event)
  const db = useDB()

  const [existing] = await db.select().from(listings).where(eq(listings.id, id))
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Annonce non trouvee' })
  }

  const updates: Record<string, any> = { updatedAt: Date.now() }
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.price !== undefined) updates.price = body.price

  await db.update(listings).set(updates).where(eq(listings.id, id))

  const [updated] = await db.select().from(listings).where(eq(listings.id, id))

  return {
    listing: {
      ...updated,
      marketData: updated.marketData ? JSON.parse(updated.marketData) : null,
      aiStats: updated.aiStats ? JSON.parse(updated.aiStats) : null,
    },
  }
})
