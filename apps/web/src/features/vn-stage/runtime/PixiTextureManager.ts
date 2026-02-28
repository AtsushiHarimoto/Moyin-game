import * as PIXI from 'pixi.js'

type CacheEntry = {
  texture: PIXI.Texture
  lastUsed: number
}

export class PixiTextureManager {
  private textures = new Map<string, CacheEntry>()
  private maxEntries = 80

  async loadTexture(url?: string): Promise<PIXI.Texture | null> {
    const normalized = typeof url === 'string' ? url.trim() : ''
    if (!normalized) return null

    const cached = this.textures.get(normalized)
    if (cached) {
      cached.lastUsed = Date.now()
      this.textures.delete(normalized)
      this.textures.set(normalized, cached)
      return cached.texture
    }

    const texture = await PIXI.Assets.load(normalized)
    this.textures.set(normalized, { texture, lastUsed: Date.now() })
    this.evictIfNeeded()
    return texture
  }

  async preload(urls: Array<string | undefined>): Promise<void> {
    await Promise.all(urls.map((url) => this.loadTexture(url)))
  }

  clear(): void {
    for (const key of this.textures.keys()) {
      void PIXI.Assets.unload(key)
    }
    this.textures.clear()
  }

  private evictIfNeeded(): void {
    while (this.textures.size > this.maxEntries) {
      const oldest = this.textures.keys().next().value as string | undefined
      if (!oldest) break
      void PIXI.Assets.unload(oldest)
      this.textures.delete(oldest)
    }
  }
}
