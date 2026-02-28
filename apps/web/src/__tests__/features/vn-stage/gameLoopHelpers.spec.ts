import type { CharacterState } from '@moyin/vn-engine'
import { normalizeStageHintPortraits, detectEndingFromEventSignals, resolveChoiceView } from '@/features/vn-stage/hooks/gameLoopHelpers'

const charactersById: Record<string, CharacterState> = {
  c_npc: {
    charId: 'c_npc',
    displayName: 'NPC',
    assets: {
      avatar: 'npc_avatar',
      portraits: {
        default: 'npc_pose_default',
        smile: 'npc_pose_smile',
      },
    },
  },
}

const resolveAssetUrl = (reference?: string): string => {
  if (!reference) return ''
  if (reference.startsWith('http://') || reference.startsWith('https://') || reference.startsWith('/')) {
    return reference
  }
  return `/assets/${reference}`
}

describe('normalizeStageHintPortraits', () => {
  it('resolves portrait key to actual asset reference by character id', () => {
    const result = normalizeStageHintPortraits(
      [{ id: 'c_npc', poseKey: 'smile', position: 'left' }],
      { charactersById, resolveAssetUrl },
    )

    expect(result).toEqual([
      { id: 'c_npc', poseUrl: '/assets/npc_pose_smile', position: 'left' },
    ])
  })

  it('supports legacy string portrait hints and maps to active cast character', () => {
    const result = normalizeStageHintPortraits(['smile'], {
      charactersById,
      activeCast: ['c_npc'],
      resolveAssetUrl,
    })

    expect(result).toEqual([
      { id: 'c_npc', poseUrl: '/assets/npc_pose_smile' },
    ])
  })

  it('keeps absolute pose url and drops invalid position values', () => {
    const result = normalizeStageHintPortraits(
      [{ id: 'c_npc', poseUrl: 'https://cdn.example.com/npc.png', position: 'top' }],
      { charactersById, resolveAssetUrl },
    )

    expect(result).toEqual([
      { id: 'c_npc', poseUrl: 'https://cdn.example.com/npc.png', position: undefined },
    ])
  })

  it('returns fallback when stageHints.portraits is absent', () => {
    const fallback = [{ id: 'prev', poseUrl: '/assets/prev' }]
    const result = normalizeStageHintPortraits(undefined, {
      charactersById,
      fallback,
      resolveAssetUrl,
    })

    expect(result).toEqual(fallback)
  })
})

describe('detectEndingFromEventSignals', () => {
  const endings = [
    { endingId: 'happy_end', terminalSceneId: 'sc_ending_happy' },
    { endingId: 'bad_end', terminalSceneId: 'sc_ending_bad' },
  ]

  it('returns null when proposals is undefined', () => {
    expect(detectEndingFromEventSignals(undefined, { endings }, 'sc_01')).toBeNull()
  })

  it('returns null when endings array is empty', () => {
    const proposals = [{ eventSignals: ['ending:happy_end'] }]
    expect(detectEndingFromEventSignals(proposals, { endings: [] }, 'sc_01')).toBeNull()
  })

  it('detects ending via "ending:" prefix convention', () => {
    const proposals = [{ eventSignals: ['ending:happy_end'] }]
    expect(detectEndingFromEventSignals(proposals, { endings }, 'sc_01')).toBe('happy_end')
  })

  it('detects ending via terminalSceneId + story_end signal', () => {
    const proposals = [{ eventSignals: ['story_end'] }]
    expect(detectEndingFromEventSignals(proposals, { endings }, 'sc_ending_happy')).toBe('happy_end')
  })

  it('detects ending via terminalSceneId + ending_reached signal', () => {
    const proposals = [{ eventSignals: ['ending_reached'] }]
    expect(detectEndingFromEventSignals(proposals, { endings }, 'sc_ending_bad')).toBe('bad_end')
  })

  it('detects ending via direct endingId match in signals', () => {
    const proposals = [{ eventSignals: ['bad_end'] }]
    expect(detectEndingFromEventSignals(proposals, { endings }, 'sc_01')).toBe('bad_end')
  })

  it('returns null when no signals match any ending', () => {
    const proposals = [{ eventSignals: ['some_random_event'] }]
    expect(detectEndingFromEventSignals(proposals, { endings }, 'sc_01')).toBeNull()
  })
})

describe('resolveChoiceView', () => {
  const packWithChoices = {
    scenes: [
      {
        sceneId: 'sc_01',
        title: 'Scene 1',
        choicePoints: [
          {
            choiceId: 'cp_01',
            options: [
              { optionId: 'opt_a', text: 'Go left', targetSceneId: 'sc_02' },
              { optionId: 'opt_b', text: 'Go right', targetSceneId: 'sc_03' },
            ],
          },
        ],
      },
      {
        sceneId: 'sc_02',
        title: 'Scene 2',
        choicePoints: [
          {
            choiceId: 'cp_locked',
            unlockConditions: { requireFlags: ['has_key'] },
            options: [
              { optionId: 'opt_unlock', text: 'Open door', targetSceneId: 'sc_04' },
            ],
          },
        ],
      },
      {
        sceneId: 'sc_03',
        title: 'Scene 3',
      },
      {
        sceneId: 'sc_04',
        title: 'Scene 4',
        choicePoints: [
          {
            choiceId: 'cp_forbid',
            unlockConditions: { forbidFlags: ['cursed'] },
            options: [
              { optionId: 'opt_safe', text: 'Take treasure', targetSceneId: 'sc_05' },
            ],
          },
        ],
      },
    ],
  }

  it('returns null when activeSceneId is null', () => {
    expect(resolveChoiceView(packWithChoices, null, new Set())).toBeNull()
  })

  it('returns null when scene has no choicePoints', () => {
    expect(resolveChoiceView(packWithChoices, 'sc_03', new Set())).toBeNull()
  })

  it('resolves choice view with valid options', () => {
    const result = resolveChoiceView(packWithChoices, 'sc_01', new Set())
    expect(result).toEqual({
      choiceId: 'cp_01',
      options: [
        { optionId: 'opt_a', text: 'Go left' },
        { optionId: 'opt_b', text: 'Go right' },
      ],
    })
  })

  it('returns null when requireFlags not satisfied', () => {
    expect(resolveChoiceView(packWithChoices, 'sc_02', new Set())).toBeNull()
  })

  it('resolves when requireFlags are satisfied', () => {
    const result = resolveChoiceView(packWithChoices, 'sc_02', new Set(['has_key']))
    expect(result).toEqual({
      choiceId: 'cp_locked',
      options: [{ optionId: 'opt_unlock', text: 'Open door' }],
    })
  })

  it('returns null when forbidFlags are present', () => {
    expect(resolveChoiceView(packWithChoices, 'sc_04', new Set(['cursed']))).toBeNull()
  })

  it('resolves when forbidFlags are absent', () => {
    const result = resolveChoiceView(packWithChoices, 'sc_04', new Set())
    expect(result).toEqual({
      choiceId: 'cp_forbid',
      options: [{ optionId: 'opt_safe', text: 'Take treasure' }],
    })
  })

  it('skips options without targetSceneId', () => {
    const pack = {
      scenes: [{
        sceneId: 'sc_01',
        choicePoints: [{
          choiceId: 'cp_mixed',
          options: [
            { optionId: 'opt_valid', text: 'Valid', targetSceneId: 'sc_02' },
            { optionId: 'opt_invalid', text: 'No target' },
          ],
        }],
      }],
    }
    const result = resolveChoiceView(pack, 'sc_01', new Set())
    expect(result?.options).toEqual([{ optionId: 'opt_valid', text: 'Valid' }])
  })

  it('returns null when all options lack targetSceneId', () => {
    const pack = {
      scenes: [{
        sceneId: 'sc_01',
        choicePoints: [{
          choiceId: 'cp_bad',
          options: [
            { optionId: 'opt_1', text: 'No target 1' },
            { optionId: 'opt_2', text: 'No target 2' },
          ],
        }],
      }],
    }
    expect(resolveChoiceView(pack, 'sc_01', new Set())).toBeNull()
  })

  it('bypasses unlock conditions when enforceConditions is false', () => {
    const result = resolveChoiceView(packWithChoices, 'sc_02', new Set(), { enforceConditions: false })
    expect(result).toEqual({
      choiceId: 'cp_locked',
      options: [{ optionId: 'opt_unlock', text: 'Open door' }],
    })
  })
})
