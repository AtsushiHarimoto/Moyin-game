import * as PIXI from 'pixi.js'
import type { PixiTextureManager } from './PixiTextureManager'

export type PixiStageCharacter = {
  id: string
  poseUrl: string
  position?: 'left' | 'center' | 'right'
}

export type PixiStageFrame = {
  bgUrl: string
  characters?: PixiStageCharacter[]
}

type LoadSceneParams = {
  stageView: PixiStageFrame
  textureManager: PixiTextureManager
  viewport?: {
    width: number
    height: number
  }
}

export class PixiSceneManager {
  private currentScene: PIXI.Container | null = null

  async loadScene({ stageView, textureManager, viewport }: LoadSceneParams): Promise<PIXI.Container> {
    const nextScene = await this.buildScene({ stageView, textureManager, viewport })
    if (this.currentScene && this.currentScene !== nextScene) {
      this.unloadScene(this.currentScene)
    }
    this.currentScene = nextScene
    return nextScene
  }

  unloadScene(scene: PIXI.Container | null): void {
    if (!scene) return
    scene.removeChildren().forEach((child) => child.destroy({ texture: false }))
    scene.destroy({ children: false, texture: false })
  }

  clear(): void {
    if (this.currentScene) this.unloadScene(this.currentScene)
    this.currentScene = null
  }

  private async buildScene({
    stageView,
    textureManager,
    viewport,
  }: LoadSceneParams): Promise<PIXI.Container> {
    const container = new PIXI.Container()
    const width = Math.max(1, Math.round(viewport?.width ?? 1280))
    const height = Math.max(1, Math.round(viewport?.height ?? 720))

    const bgTexture = await textureManager.loadTexture(stageView.bgUrl)
    if (bgTexture) {
      const bgSprite = new PIXI.Sprite(bgTexture)
      bgSprite.anchor.set(0.5)
      bgSprite.x = width / 2
      bgSprite.y = height / 2

      const bgScaleX = width / Math.max(1, bgTexture.width)
      const bgScaleY = height / Math.max(1, bgTexture.height)
      const bgScale = Math.max(bgScaleX, bgScaleY)
      bgSprite.scale.set(bgScale)
      container.addChild(bgSprite)
    }

    const characters = stageView.characters ?? []
    for (const character of characters) {
      const texture = await textureManager.loadTexture(character.poseUrl)
      if (!texture) continue
      const sprite = new PIXI.Sprite(texture)
      sprite.anchor.set(0.5, 1)
      sprite.x = resolveCharacterX(character.position, width)
      sprite.y = height * 0.96

      const maxWidth = width * 0.42
      const maxHeight = height * 0.9
      const scaleX = maxWidth / Math.max(1, texture.width)
      const scaleY = maxHeight / Math.max(1, texture.height)
      const scale = Math.min(scaleX, scaleY)
      sprite.scale.set(Math.max(0.01, scale))
      container.addChild(sprite)
    }

    return container
  }
}

function resolveCharacterX(position: PixiStageCharacter['position'], width: number): number {
  if (position === 'left') return width * 0.25
  if (position === 'right') return width * 0.75
  return width * 0.5
}
