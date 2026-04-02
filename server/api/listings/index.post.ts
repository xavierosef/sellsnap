import { nanoid } from 'nanoid'
import { useDB } from '~/server/database'
import { listings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.title || !body.description || !body.price) {
    throw createError({ statusCode: 400, statusMessage: 'title, description et price sont requis' })
  }

  const now = Date.now()
  const listing = {
    id: nanoid(12),
    title: body.title,
    description: body.description,
    price: body.price,
    category: body.category || null,
    thumbnail: body.thumbnail || null,
    context: body.context || null,
    marketData: body.marketData ? JSON.stringify(body.marketData) : null,
    aiStats: body.aiStats ? JSON.stringify(body.aiStats) : null,
    createdAt: now,
    updatedAt: now,
  }

  const db = useDB()
  await db.insert(listings).values(listing)

  return { listing }
})
