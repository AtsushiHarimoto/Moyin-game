import { describe, expect, it } from 'vitest'

import { jsonToFlow, isSceneInPack, isCharInPack } from '@/features/story-preview/components/flowHelpers'

describe('flowHelpers.jsonToFlow', () => {
  it('同一個 sceneId 被多章節引用時只渲染一個 scene 節點', () => {
    const { nodes, edges } = jsonToFlow({
      manifest: {
        storyKey: 'test-story',
        title: 'Test Story',
      },
      scenes: [
        { sceneId: 's1', title: 'Scene 1' },
        { sceneId: 's2', title: 'Scene 2' },
      ],
      chapters: [
        { chapterId: 'ch1', title: 'Chapter 1', sceneIds: ['s1'] },
        { chapterId: 'ch2', title: 'Chapter 2', sceneIds: ['s1', 's2'] },
      ],
    })

    expect(nodes.filter((n) => n.id === 'scene-s1')).toHaveLength(1)
    expect(nodes.filter((n) => n.id === 'scene-s2')).toHaveLength(1)

    expect(edges.some((e) => e.id === 'e-chapter-ch1-scene-s1')).toBe(true)
    expect(edges.some((e) => e.id === 'e-chapter-ch2-scene-s1')).toBe(true)
    expect(edges.some((e) => e.id === 'e-chapter-ch2-scene-s2')).toBe(true)
  })

  it('共享場景若任一章節標記為 entry，scene 節點需顯示 entry', () => {
    const { nodes } = jsonToFlow({
      manifest: {
        storyKey: 'test-story',
        title: 'Test Story',
      },
      scenes: [{ sceneId: 's1', title: 'Scene 1' }],
      chapters: [
        { chapterId: 'ch1', title: 'Chapter 1', sceneIds: ['s1'] },
        {
          chapterId: 'ch2',
          title: 'Chapter 2',
          sceneIds: ['s1'],
          entrySceneId: 's1',
        },
      ],
    })

    const sceneNode = nodes.find((n) => n.id === 'scene-s1')
    expect(sceneNode).toBeDefined()
    expect(
      (sceneNode?.data as { isEntry?: boolean } | undefined)?.isEntry,
    ).toBe(true)
  })

  it('同章節重複 sceneIds 不會重複建立 edge，sceneCount 以去重後計算', () => {
    const { nodes, edges } = jsonToFlow({
      manifest: {
        storyKey: 'test-story',
        title: 'Test Story',
      },
      scenes: [{ sceneId: 's1', title: 'Scene 1' }],
      chapters: [
        {
          chapterId: 'ch1',
          title: 'Chapter 1',
          sceneIds: ['s1', 's1', 's1'],
        },
      ],
    })

    expect(nodes.filter((n) => n.id === 'scene-s1')).toHaveLength(1)
    expect(
      edges.filter(
        (e) => e.source === 'chapter-ch1' && e.target === 'scene-s1',
      ),
    ).toHaveLength(1)

    const chapterNode = nodes.find((n) => n.id === 'chapter-ch1')
    expect(chapterNode).toBeDefined()
    expect(
      (chapterNode?.data as { sceneCount?: number } | undefined)?.sceneCount,
    ).toBe(1)
  })

  it('多章節共享同一 Scene 時，Chapter 節點不應重疊', () => {
    const { nodes } = jsonToFlow({
      manifest: {
        storyKey: 'test-story',
        title: 'Test Story',
      },
      scenes: [{ sceneId: 's1', title: 'Scene 1' }],
      chapters: [
        { chapterId: 'ch1', title: 'Chapter 1', sceneIds: ['s1'] },
        { chapterId: 'ch2', title: 'Chapter 2', sceneIds: ['s1'] },
      ],
    })

    const chapterOne = nodes.find((n) => n.id === 'chapter-ch1')
    const chapterTwo = nodes.find((n) => n.id === 'chapter-ch2')
    if (!chapterOne || !chapterTwo) {
      throw new Error('chapter nodes not found')
    }

    const deltaY = Math.abs(chapterOne.position.y - chapterTwo.position.y)
    expect(deltaY).toBeGreaterThanOrEqual(120)
  })

  it('缺失場景被多章節引用時只渲染一個 ghost scene 節點', () => {
    const { nodes, edges } = jsonToFlow({
      manifest: {
        storyKey: 'test-story',
        title: 'Test Story',
      },
      scenes: [],
      chapters: [
        { chapterId: 'ch1', title: 'Chapter 1', sceneIds: ['missing-scene'] },
        { chapterId: 'ch2', title: 'Chapter 2', sceneIds: ['missing-scene'] },
      ],
    })

    expect(nodes.filter((n) => n.id === 'scene-missing-scene')).toHaveLength(1)
    expect(
      edges.filter((e) => e.target === 'scene-missing-scene'),
    ).toHaveLength(2)
  })

  it('entrySceneId 不在章節的 sceneIds 中時，場景不應標記為 entry，章節應標記 hasInvalidEntry', () => {
    const { nodes } = jsonToFlow({
      manifest: {
        storyKey: 'test-story',
        title: 'Test Story',
      },
      scenes: [
        { sceneId: 's1', title: 'Scene 1' },
        { sceneId: 's2', title: 'Scene 2' },
      ],
      chapters: [
        {
          chapterId: 'ch1',
          title: 'Chapter 1',
          sceneIds: ['s1'],
          entrySceneId: 's2', // s2 is NOT in ch1's sceneIds
        },
        {
          chapterId: 'ch2',
          title: 'Chapter 2',
          sceneIds: ['s2'],
        },
      ],
    })

    // s2 should NOT be marked as entry (ch1's entry is invalid, ch2 has no entry)
    const s2Node = nodes.find((n) => n.id === 'scene-s2')
    expect(s2Node).toBeDefined()
    expect(
      (s2Node?.data as { isEntry?: boolean } | undefined)?.isEntry,
    ).toBe(false)

    // ch1 should have hasInvalidEntry = true
    const ch1Node = nodes.find((n) => n.id === 'chapter-ch1')
    expect(ch1Node).toBeDefined()
    expect(
      (ch1Node?.data as { hasInvalidEntry?: boolean } | undefined)?.hasInvalidEntry,
    ).toBe(true)

    // ch2 should have hasInvalidEntry = false
    const ch2Node = nodes.find((n) => n.id === 'chapter-ch2')
    expect(ch2Node).toBeDefined()
    expect(
      (ch2Node?.data as { hasInvalidEntry?: boolean } | undefined)?.hasInvalidEntry,
    ).toBe(false)
  })

  it('缺少 ID 的章節應獲得唯一的備用 ID，不發生碰撞', () => {
    const { nodes } = jsonToFlow({
      manifest: {
        storyKey: 'test-story',
        title: 'Test Story',
      },
      scenes: [{ sceneId: 's1', title: 'Scene 1' }],
      // Three chapters with no IDs — all reference s1
      chapters: [
        { title: 'Anon Chapter 1', sceneIds: ['s1'] },
        { title: 'Anon Chapter 2', sceneIds: ['s1'] },
        { title: 'Anon Chapter 3', sceneIds: ['s1'] },
      ],
    })

    // All chapter nodes must have distinct IDs (none should be "chapter-")
    const chapterNodes = nodes.filter(
      (n) => (n.data as Record<string, unknown>).type === 'chapter',
    )
    expect(chapterNodes).toHaveLength(3)
    const chapterNodeIds = chapterNodes.map((n) => n.id)
    expect(new Set(chapterNodeIds).size).toBe(3)
    expect(chapterNodeIds).not.toContain('chapter-')
  })
})

describe('flowHelpers reference checks', () => {
  it('isSceneInPack 正確識別存在與缺失的場景', () => {
    const pack = {
      manifest: { storyKey: 'test', title: 'Test' },
      scenes: [{ sceneId: 's1', title: 'S1' }],
    }
    expect(isSceneInPack('s1', pack)).toBe(true)
    expect(isSceneInPack('missing', pack)).toBe(false)
  })

  it('isCharInPack 正確識別存在與缺失的角色', () => {
    const pack = {
      manifest: { storyKey: 'test', title: 'Test' },
      characters: [{ charId: 'c1', displayName: 'Char 1' }],
    }
    expect(isCharInPack('c1', pack)).toBe(true)
    expect(isCharInPack('missing', pack)).toBe(false)
  })
})
