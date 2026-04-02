import { eq } from 'drizzle-orm'
import { useDB } from '~/server/database'
import { listings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID requis' })
  }

  const db = useDB()

  const [existing] = await db.select().from(listings).where(eq(listings.id, id))
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Annonce non trouvee' })
  }

  await db.delete(listings).where(eq(listings.id, id))

  return { ok: true }
})
