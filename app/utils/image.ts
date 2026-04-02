const MAX_DIMENSION = 1024
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function getMediaType(file: File): string {
  const map: Record<string, string> = {
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'image/gif': 'image/gif',
    'image/webp': 'image/webp',
  }
  return map[file.type] || 'image/jpeg'
}

export function isValidImageFile(file: File): boolean {
  return file.type.startsWith('image/') && file.size <= MAX_FILE_SIZE
}

export function getFileSizeError(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    return `${file.name} fait ${sizeMB} MB (max 10 MB)`
  }
  return null
}

/**
 * Resize image to max 1024px on longest side, then return base64 (without data: prefix)
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality = mimeType === 'image/jpeg' ? 0.85 : undefined
      const dataUrl = canvas.toDataURL(mimeType, quality)
      resolve(dataUrl.split(',')[1])
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Impossible de lire l'image: ${file.name}`))
    }

    img.src = url
  })
}

/**
 * Generate a preview URL for display (no resize, just a blob URL)
 */
export function fileToPreview(file: File): string {
  return URL.createObjectURL(file)
}
