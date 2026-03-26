export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)

  // Only protect /api/analyze
  if (!url.pathname.startsWith('/api/analyze')) return

  const token = getCookie(event, 'sellsnap_session')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Non autorisé' })
  }

  const config = useRuntimeConfig()

  try {
    const decoded = atob(token)
    const [timestamp, hash] = decoded.split(':')

    const encoder = new TextEncoder()
    const data = encoder.encode(timestamp + ':' + config.sessionSecret)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const expectedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    if (hash !== expectedHash) throw new Error('bad hash')

    const age = Date.now() - Number(timestamp)
    if (age > 7 * 24 * 60 * 60 * 1000) throw new Error('expired')
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Session invalide ou expirée' })
  }
})
