// Reduz e converte imagens para WebP no navegador antes do upload. Fotos de
// celular (3–8 MB) viram arquivos de ~100–400 KB, e a página carrega mais rápido.
export async function optimizeImage(file, { maxSize = 1600, quality = 0.85 } = {}) {
  if (typeof createImageBitmap !== 'function' || !file.type.startsWith('image/')) return file
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  // Navegadores sem suporte a WebP devolvem PNG; se não ficou menor, mantém o original.
  if (!blob || blob.type !== 'image/webp' || (scale === 1 && blob.size >= file.size)) return file
  const name = file.name.replace(/\.[^.]+$/, '') || 'imagem'
  return new File([blob], `${name}.webp`, { type: 'image/webp', lastModified: Date.now() })
}
