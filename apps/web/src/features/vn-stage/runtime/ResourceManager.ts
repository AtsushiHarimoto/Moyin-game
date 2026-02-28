/**
 * ResourceManager
 * Purpose: lightweight image preloader/cache for VN stage assets.
 * Keeps a promise cache so repeated scene switches reuse the same request.
 */
export class ResourceManager {
  private imageCache = new Map<string, Promise<void>>()

  preloadImage(url?: string): Promise<void> {
    const normalized = typeof url === 'string' ? url.trim() : ''
    if (!normalized) return Promise.resolve()

    const existing = this.imageCache.get(normalized)
    if (existing) return existing

    if (typeof Image === 'undefined') {
      return Promise.resolve()
    }

    const task = new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Failed to load image: ${normalized}`))
      img.src = normalized
    }).catch((error) => {
      this.imageCache.delete(normalized)
      throw error
    })

    this.imageCache.set(normalized, task)
    return task
  }

  async preloadImages(urls: Array<string | undefined>): Promise<void> {
    const tasks = urls
      .map((url) => this.preloadImage(url))
    await Promise.all(tasks)
  }

  clear(): void {
    this.imageCache.clear()
  }
}
