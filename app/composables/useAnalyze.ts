import { fileToBase64, fileToPreview, getMediaType, isValidImageFile, getFileSizeError, generateThumbnail } from '~/utils/image'

export type Step = 'upload' | 'analyzing' | 'result'

export interface AiStats {
  inputTokens: number
  outputTokens: number
  model: string
  costUsd: number
  durationMs: number
}

export interface MarketData {
  stats: {
    count: number
    min: number
    max: number
    median: number
    average: number
  }
  listings: {
    title: string
    price: number
    url: string
    location?: string
  }[]
}

export function useAnalyze() {
  const step = ref<Step>('upload')
  const images = ref<File[]>([])
  const previews = ref<string[]>([])
  const context = ref('')
  const title = ref('')
  const description = ref('')
  const price = ref('')
  const category = ref('')
  const error = ref('')
  const elapsed = ref(0)
  const aiStats = ref<AiStats | null>(null)
  const market = ref<MarketData | null>(null)
  const isRefining = ref(false)
  const savedListingId = ref<string | null>(null)

  let timerInterval: ReturnType<typeof setInterval> | null = null
  let abortController: AbortController | null = null

  function addImages(files: FileList | File[]) {
    const fileArray = Array.from(files)
    const remaining = 8 - images.value.length
    if (remaining <= 0) return

    const errors: string[] = []
    const valid: File[] = []

    for (const f of fileArray.slice(0, remaining)) {
      if (!f.type.startsWith('image/')) continue
      const sizeErr = getFileSizeError(f)
      if (sizeErr) {
        errors.push(sizeErr)
        continue
      }
      valid.push(f)
    }

    if (errors.length > 0) {
      error.value = errors.join('. ')
    }

    if (valid.length === 0) return

    images.value = [...images.value, ...valid]
    for (const f of valid) {
      previews.value = [...previews.value, fileToPreview(f)]
    }
  }

  function removeImage(index: number) {
    const preview = previews.value[index]
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }
    images.value = images.value.filter((_, i) => i !== index)
    previews.value = previews.value.filter((_, i) => i !== index)
  }

  function cancelAnalysis() {
    abortController?.abort()
    stopTimer()
    step.value = 'upload'
    isRefining.value = false
    error.value = 'Analyse annulée.'
  }

  function startTimer() {
    elapsed.value = 0
    const startTime = Date.now()
    timerInterval = setInterval(() => {
      elapsed.value = Date.now() - startTime
    }, 200)
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    elapsed.value = 0
  }

  async function analyze(extraContext = '') {
    error.value = ''
    const wasOnResult = step.value === 'result'
    if (!wasOnResult) step.value = 'analyzing'
    else isRefining.value = true

    startTimer()
    abortController = new AbortController()
    const startMs = Date.now()

    try {
      // Convert images to base64 (with resize)
      const imageData = await Promise.all(
        images.value.map(async (file) => ({
          base64: await fileToBase64(file),
          mediaType: getMediaType(file),
        }))
      )

      const response = await $fetch<{
        title: string
        description: string
        price: string
        category: string
        stats: {
          inputTokens: number
          outputTokens: number
          model: string
          costUsd: number
        }
        market: MarketData | null
      }>('/api/analyze', {
        method: 'POST',
        body: {
          images: imageData,
          context: context.value,
          extraContext,
          currentTitle: wasOnResult ? title.value : undefined,
          currentDescription: wasOnResult ? description.value : undefined,
          currentPrice: wasOnResult ? price.value : undefined,
        },
        signal: abortController.signal,
        timeout: 65000,
      })

      title.value = response.title
      description.value = response.description
      price.value = response.price
      category.value = response.category
      aiStats.value = {
        ...response.stats,
        durationMs: Date.now() - startMs,
      }
      market.value = response.market
      step.value = 'result'

      // Auto-save to database (only on first generation, not refinement)
      if (!wasOnResult) {
        try {
          const thumbnail = images.value.length > 0
            ? await generateThumbnail(images.value[0])
            : null

          const saved = await $fetch<{ listing: { id: string } }>('/api/listings', {
            method: 'POST',
            body: {
              title: title.value,
              description: description.value,
              price: price.value,
              category: category.value,
              thumbnail,
              context: context.value,
              marketData: market.value,
              aiStats: aiStats.value,
            },
          })
          savedListingId.value = saved.listing.id
        } catch (e) {
          console.warn('Auto-save failed:', e)
        }
      } else if (savedListingId.value) {
        // Update existing listing on refinement
        try {
          await $fetch(`/api/listings/${savedListingId.value}`, {
            method: 'PATCH',
            body: {
              title: title.value,
              description: description.value,
              price: price.value,
            },
          })
        } catch (e) {
          console.warn('Auto-update failed:', e)
        }
      }
    } catch (err: any) {
      console.error(err)

      if (err.name === 'AbortError') {
        error.value = "L'analyse a pris trop de temps. Essayez avec moins de photos ou des images plus légères."
      } else if (err.statusCode === 401) {
        error.value = "Erreur d'authentification API. Vérifiez la configuration."
      } else if (err.statusCode === 429) {
        error.value = 'Trop de requêtes. Attendez un moment puis réessayez.'
      } else if (err.statusCode === 504) {
        error.value = "L'analyse a pris trop de temps. Essayez avec moins de photos."
      } else if (err.statusCode >= 500) {
        error.value = 'Le serveur IA est temporairement indisponible. Réessayez dans quelques instants.'
      } else {
        error.value = err.data?.statusMessage || err.message || 'Vérifiez vos photos et réessayez.'
      }

      if (!wasOnResult) step.value = 'upload'
    } finally {
      stopTimer()
      isRefining.value = false
    }
  }

  // Debounced save of field edits to the database
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function saveFields() {
    if (!savedListingId.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(async () => {
      try {
        await $fetch(`/api/listings/${savedListingId.value}`, {
          method: 'PATCH',
          body: {
            title: title.value,
            description: description.value,
            price: price.value,
          },
        })
      } catch (e) {
        console.warn('Auto-save field edit failed:', e)
      }
    }, 1000)
  }

  // Watch for manual edits and auto-save
  watch([title, description, price], () => {
    if (step.value === 'result' && savedListingId.value && !isRefining.value) {
      saveFields()
    }
  })

  function reset() {
    // Revoke all blob URLs
    for (const p of previews.value) {
      if (p.startsWith('blob:')) URL.revokeObjectURL(p)
    }
    step.value = 'upload'
    images.value = []
    previews.value = []
    context.value = ''
    title.value = ''
    description.value = ''
    price.value = ''
    category.value = ''
    error.value = ''
    elapsed.value = 0
    isRefining.value = false
    aiStats.value = null
    market.value = null
    savedListingId.value = null
    if (saveTimer) clearTimeout(saveTimer)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopTimer()
    abortController?.abort()
    if (saveTimer) clearTimeout(saveTimer)
    for (const p of previews.value) {
      if (p.startsWith('blob:')) URL.revokeObjectURL(p)
    }
  })

  return {
    step,
    images,
    previews,
    context,
    title,
    description,
    price,
    category,
    error,
    elapsed,
    isRefining,
    aiStats,
    market,
    savedListingId,
    addImages,
    removeImage,
    cancelAnalysis,
    analyze,
    reset,
  }
}
