export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey

  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'ANTHROPIC_API_KEY non configuree' })
  }

  const body = await readBody<{
    images: { base64: string; mediaType: string }[]
  }>(event)

  if (!body.images || body.images.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Au moins une image est requise' })
  }

  const imageContents = body.images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mediaType,
      data: img.base64,
    },
  }))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const prompt = `Regarde ces photos d'un objet a vendre d'occasion en France.

Estime UNIQUEMENT le prix de vente occasion realiste. Pas de titre, pas de description.

Reponds UNIQUEMENT en JSON valide, sans backticks :
{
  "price": "Prix occasion en euros (juste le nombre, arrondi)",
  "reason": "Justification courte (1 phrase max, en francais)",
  "category": "Categorie (Electronique, Mobilier, Vetements, etc.)"
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: [...imageContents, { type: 'text', text: prompt }] }],
      }),
    })

    if (!response.ok) {
      throw createError({ statusCode: response.status, statusMessage: 'Erreur API Claude' })
    }

    const data = await response.json()
    const text = data.content?.map((i: any) => i.text || '').join('') || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return {
      price: result.price || '?',
      reason: result.reason || '',
      category: result.category || '',
    }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Erreur estimation',
    })
  } finally {
    clearTimeout(timeout)
  }
})
