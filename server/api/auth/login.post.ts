export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const { password } = await readBody<{ password: string }>(event)

  if (!config.appPassword) {
    throw createError({
      statusCode: 500,
      statusMessage: 'APP_PASSWORD non configuré dans les variables d\'environnement',
    })
  }

  if (password !== config.appPassword) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Mot de passe incorrect',
    })
  }

  // Create a simple signed token: base64(timestamp:hash)
  const timestamp = Date.now().toString()
  const encoder = new TextEncoder()
  const data = encoder.encode(timestamp + ':' + config.sessionSecret)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  const token = btoa(`${timestamp}:${hash}`)

  // Set HttpOnly cookie — valid 7 days
  setCookie(event, 'sellsnap_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return { ok: true }
})
