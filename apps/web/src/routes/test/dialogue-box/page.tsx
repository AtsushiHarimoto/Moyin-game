import { useMemo, useState } from 'react'
import { StageViewport, type StageViewportFrame } from '@/features/vn-stage/components/StageViewport'
import { DialogueBox } from '@/features/vn-stage/components/DialogueBox'

const SAMPLE_LINES = [
  { speaker: '旁白', text: '櫻花緩緩落下，街道在黃昏中泛著粉色的光。' },
  { speaker: '小櫻', text: '你終於來了，我等你好久。' },
  { speaker: '玩家', text: '抱歉，路上有點塞車。今天過得還好嗎？' },
]

export default function TestDialogueBoxPage() {
  const [index, setIndex] = useState(0)
  const line = SAMPLE_LINES[index % SAMPLE_LINES.length]

  const frame = useMemo<StageViewportFrame>(
    () => ({
      bgUrl: '/img/school.png',
      characters: [
        {
          id: 'c_sakura',
          poseUrl: '/img/girl.png',
          position: 'center',
        },
      ],
    }),
    [],
  )

  return (
    <div className="h-screen w-full" data-testid="test-dialogue-box-page">
      <StageViewport
        frame={frame}
        frameOverlay={(
          <DialogueBox
            speaker={line.speaker}
            text={line.text}
            typewriter={false}
            showNextHint
            onClick={() => setIndex((prev) => prev + 1)}
          />
        )}
      />
    </div>
  )
}
