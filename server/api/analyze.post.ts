async function callClaude(
  apiKey: string,
  messages: any[],
  signal: AbortSignal,
  maxTokens = 1000
) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal,
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages,
    }),
  })

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    const statusMessages: Record<number, string> = {
      401: 'Clé API invalide. Vérifiez votre ANTHROPIC_API_KEY.',
      429: 'Trop de requêtes. Réessayez dans quelques instants.',
      500: 'Erreur serveur Anthropic. Réessayez.',
      529: 'API Anthropic surchargée. Réessayez dans quelques instants.',
    }
    throw createError({
      statusCode: response.status,
      statusMessage: statusMessages[response.status] || `Erreur API: ${errBody.slice(0, 200)}`,
    })
  }

  return await response.json()
}

function parseJsonResponse(data: any): any {
  const text = data.content?.map((i: any) => i.text || '').join('') || ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiKey = config.anthropicApiKey

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ANTHROPIC_API_KEY non configurée dans .env',
    })
  }

  const body = await readBody<{
    images: { base64: string; mediaType: string }[]
    context?: string
    extraContext?: string
    currentTitle?: string
    currentDescription?: string
    currentPrice?: string
  }>(event)

  if (!body.images || body.images.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Au moins une image est requise' })
  }
  if (body.images.length > 8) {
    throw createError({ statusCode: 400, statusMessage: 'Maximum 8 images autorisées' })
  }

  const imageContents = body.images.map((img) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: img.mediaType,
      data: img.base64,
    },
  }))

  // Build context
  const contextParts: string[] = []
  if (body.context?.trim()) contextParts.push(`Contexte du vendeur : ${body.context.trim()}`)
  if (body.extraContext?.trim()) contextParts.push(`Instructions supplémentaires : ${body.extraContext.trim()}`)
  if (body.currentTitle) contextParts.push(`Titre actuel : ${body.currentTitle}`)
  if (body.currentDescription) contextParts.push(`Description actuelle : ${body.currentDescription}`)
  if (body.currentPrice) contextParts.push(`Prix actuel : ${body.currentPrice}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90000)

  let totalInputTokens = 0
  let totalOutputTokens = 0

  try {
    // ═══════════════════════════════════════
    // PASSE 1 : Analyse visuelle + pricing occasion
    // ═══════════════════════════════════════
    const pass1Prompt = `Tu es un expert de la vente d'occasion sur les plateformes françaises (LeBonCoin, Vinted, Facebook Marketplace).

Analyse ces photos d'un article à vendre et génère une annonce optimisée.
${contextParts.length ? '\n' + contextParts.join('\n') : ''}

RÈGLES DE PRICING OCCASION :
- Tu estimes le prix pour le MARCHÉ DE L'OCCASION en France, PAS le prix neuf.
- Un objet d'occasion vaut typiquement 30-60% de son prix neuf selon l'état.
- Prends en compte : l'usure visible sur les photos, les rayures/défauts, l'ancienneté probable du modèle.
- Pour l'électronique : décote rapide, -20% par an minimum.
- Pour le mobilier : décote de 40-70% sauf pièces design/vintage.
- Pour les vêtements : décote de 50-80% sauf marques premium.
- Préfère un prix légèrement bas pour une vente rapide plutôt qu'un prix optimiste qui ne se vendra pas.
- Arrondis à un chiffre rond (pas de centimes).

Réponds UNIQUEMENT en JSON valide, sans backticks, sans texte avant/après :
{
  "title": "Titre accrocheur et descriptif (max 60 caractères)",
  "description": "Description détaillée, honnête et vendeuse. Mentionne l'état, les caractéristiques clés, et les défauts visibles. 3-5 phrases.",
  "price": "Prix occasion suggéré en euros (juste le nombre)",
  "category": "Catégorie (Électronique, Mobilier, Vêtements, Auto, Sport, Jeux, Maison, etc.)",
  "searchQuery": "Recherche COURTE et SIMPLE comme un acheteur taperait sur LeBonCoin. 2-3 mots max : type + marque (+ modèle si connu). JAMAIS de détails, variantes, magasins ou mots superflus. Ex: 'Souris Logitech MX Master', 'Canapé cuir noir', 'Nike Air Max', 'iPhone 14', 'Bureau IKEA'"
}`

    const pass1Data = await callClaude(
      apiKey,
      [{ role: 'user', content: [...imageContents, { type: 'text', text: pass1Prompt }] }],
      controller.signal,
    )

    const pass1 = parseJsonResponse(pass1Data)
    totalInputTokens += pass1Data.usage?.input_tokens || 0
    totalOutputTokens += pass1Data.usage?.output_tokens || 0

    let finalTitle = pass1.title || ''
    let finalDescription = (pass1.description || '').replace(/\\n/g, '\n')
    let finalPrice = pass1.price || ''
    const finalCategory = pass1.category || ''
    const searchQuery = pass1.searchQuery || finalTitle

    // ═══════════════════════════════════════
    // PASSE 2 : Recherche marché LeBonCoin + ajustement prix
    // ═══════════════════════════════════════
    let marketListings: any[] = []
    let priceStats = null

    try {
      console.log(`[LeBonCoin] Searching for: "${searchQuery}"`)
      marketListings = await searchLeBonCoin(searchQuery, 15)
      console.log(`[LeBonCoin] Found ${marketListings.length} listings`)
      priceStats = computePriceStats(marketListings)
      if (priceStats) {
        console.log(`[LeBonCoin] Price stats: min=${priceStats.min}€ median=${priceStats.median}€ max=${priceStats.max}€`)
      }
    } catch (e: any) {
      console.warn(`[LeBonCoin] Search failed:`, e.message || e)
    }

    // Si on a des données marché, 2ème appel Claude pour ajuster le prix
    if (priceStats && priceStats.count >= 2) {
      const topListings = marketListings.slice(0, 8).map(
        (l) => `- "${l.title}" → ${l.price} €${l.location ? ` (${l.location})` : ''}`
      ).join('\n')

      const pass2Prompt = `Tu as généré cette annonce :
Titre : ${finalTitle}
Description : ${finalDescription}
Prix suggéré : ${finalPrice} €

Voici ${priceStats.count} annonces SIMILAIRES actuellement en ligne sur LeBonCoin :
${topListings}

Statistiques des prix du marché :
- Min : ${priceStats.min} € | Max : ${priceStats.max} € | Médian : ${priceStats.median} € | Moyenne : ${priceStats.average} €

En te basant sur ces données RÉELLES du marché, ajuste ton prix pour être compétitif.
Positionne-toi légèrement sous la médiane pour une vente rapide, sauf si l'article semble en meilleur état que la moyenne.

Réponds UNIQUEMENT en JSON valide, sans backticks :
{
  "price": "Prix ajusté (juste le nombre)",
  "priceReasoning": "Explication courte de l'ajustement (1 phrase)"
}`

      try {
        const pass2Data = await callClaude(
          apiKey,
          [{ role: 'user', content: pass2Prompt }],
          controller.signal,
          300,
        )

        const pass2 = parseJsonResponse(pass2Data)
        totalInputTokens += pass2Data.usage?.input_tokens || 0
        totalOutputTokens += pass2Data.usage?.output_tokens || 0

        if (pass2.price) finalPrice = pass2.price
      } catch (e) {
        // Fail graceful — on garde le prix de la passe 1
        console.warn('[Pass 2] Price adjustment failed, keeping pass 1 price:', e)
      }
    }

    // ═══════════════════════════════════════
    // Réponse finale
    // ═══════════════════════════════════════
    const model = pass1Data.model || 'claude-sonnet-4-20250514'
    const costUsd = (totalInputTokens * 3 + totalOutputTokens * 15) / 1_000_000

    return {
      title: finalTitle,
      description: finalDescription,
      price: finalPrice,
      category: finalCategory,
      stats: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        model,
        costUsd: Math.round(costUsd * 10000) / 10000,
      },
      market: priceStats
        ? {
            stats: priceStats,
            listings: marketListings.slice(0, 5).map((l) => ({
              title: l.title,
              price: l.price,
              url: l.url,
              location: l.location,
            })),
          }
        : null,
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw createError({
        statusCode: 504,
        statusMessage: "L'analyse a pris trop de temps (>90s). Essayez avec moins de photos.",
      })
    }
    if (err.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: err.message || 'Erreur inconnue lors de l\'analyse',
    })
  } finally {
    clearTimeout(timeout)
  }
})
