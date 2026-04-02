import { nanoid } from 'nanoid'
import { useDB } from '../database'
import { waitlist } from '../database/schema'
import { eq, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const email = body.email?.trim()?.toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email invalide' })
  }

  const db = useDB()

  // Check duplicate
  const [existing] = await db.select().from(waitlist).where(eq(waitlist.email, email))
  if (existing) {
    return { ok: true, message: 'already_registered' }
  }

  await db.insert(waitlist).values({
    id: nanoid(12),
    email,
    createdAt: Date.now(),
  })

  // Get total count
  const [result] = await db.select({ value: count() }).from(waitlist)

  return { ok: true, message: 'registered', count: result.value }
})
