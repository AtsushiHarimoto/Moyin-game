import * as PIXI from 'pixi.js'

export type PixiLayerSet = {
  background: PIXI.Container
  scene: PIXI.Container
  ui: PIXI.Container
  fx: PIXI.Container
  transition: PIXI.Container
}

export type PixiRenderInstance = {
  app: PIXI.Application
  layers: PixiLayerSet
}

export class PixiRenderManager {
  private instances = new Map<string, PixiRenderInstance>()
  private refCounts = new Map<string, number>()

  async init(key: string, canvas: HTMLCanvasElement): Promise<PixiRenderInstance> {
    const existing = this.instances.get(key)
    if (existing) return existing

    const app = new PIXI.Application()
    await app.init({
      canvas,
      backgroundAlpha: 0,
      antialias: true,
      resizeTo: canvas.parentElement || undefined,
    })

    const layers: PixiLayerSet = {
      background: new PIXI.Container(),
      scene: new PIXI.Container(),
      ui: new PIXI.Container(),
      fx: new PIXI.Container(),
      transition: new PIXI.Container(),
    }
    Object.values(layers).forEach((layer) => app.stage.addChild(layer))

    const instance: PixiRenderInstance = { app, layers }
    this.instances.set(key, instance)
    return instance
  }

  async acquire(key: string, canvas: HTMLCanvasElement): Promise<PixiRenderInstance> {
    const instance = await this.init(key, canvas)
    this.refCounts.set(key, (this.refCounts.get(key) || 0) + 1)
    return instance
  }

  release(key: string): void {
    const current = this.refCounts.get(key)
    if (!current) return
    if (current <= 1) {
      this.refCounts.delete(key)
      this.dispose(key)
      return
    }
    this.refCounts.set(key, current - 1)
  }

  dispose(key: string): void {
    const instance = this.instances.get(key)
    if (!instance) return

    Object.values(instance.layers).forEach((layer) => {
      layer.removeChildren()
    })
    instance.app.destroy(true, { children: true, texture: false })
    this.instances.delete(key)
  }
}
