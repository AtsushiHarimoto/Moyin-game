import type { StageFrame } from '../store'
import type { ResourceManager } from './ResourceManager'

type LoadSceneParams = {
  stageView: StageFrame
  resourceManager: ResourceManager
}

/**
 * SceneManager
 * Purpose: prepare scene assets before display (background + portraits).
 * Mirrors V1's scene load lifecycle at the resource level.
 */
export class SceneManager {
  async loadScene({ stageView, resourceManager }: LoadSceneParams): Promise<void> {
    const bgUrl = stageView.bgUrl
    const portraitUrls = (stageView.characters ?? []).map((character) => character.poseUrl)
    await resourceManager.preloadImages([bgUrl, ...portraitUrls])
  }
}
