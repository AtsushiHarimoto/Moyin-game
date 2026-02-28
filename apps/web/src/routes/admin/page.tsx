/** StoryFactory admin console - character & story generation pipeline. */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/cn'
import {
  Terminal,
  Wand2,
  Image,
  UserPlus,
  BookOpen,
  ScrollText,
  Send,
} from 'lucide-react'

type ToggleType = 'story' | 'char' | 'template' | 'charPrompt' | 'charImg' | ''

interface GenerateCharModel {
  filterName: string
  characterId: string
  characterNickname: string
  numberOfStages: number
  gender: number
  fetchLocal: string
}

interface GenerateStoryModel {
  charOptions: {
    char_id: {
      id: string
      name: string
      nickname: string
      des: string
      behaviors: string[]
    }
  }
  stageOptions: unknown[]
  eventNames: string[]
  storyKey: string
  intro: string
}

interface GenerateStoryTemplateModel {
  charIds: string[]
  eventEffect: unknown[]
  stageDes: unknown[]
  des: unknown[]
  behaviors: unknown[]
  begin: string
  intro: string
  storyKey: string
  numberOfStages: number
  conversionModel: unknown[]
  eventNames: string[]
  triggerLevel: number[]
}

interface GenerateCharPromptModel {
  name: string
  hair: string
  bodyshape: string
  look: string
  eyes: string
  stageDes: { scene: string; clothes: string }[]
}

interface CharImgModel {
  name: string
  stageOutput: unknown[]
  avatarOutput: unknown[]
  emoOutput: unknown[]
}

const DEFAULT_CHAR_MODEL: GenerateCharModel = {
  filterName: '',
  characterId: '',
  characterNickname: '',
  numberOfStages: 0,
  gender: 1,
  fetchLocal: '',
}

const DEFAULT_STORY_MODEL: GenerateStoryModel = {
  charOptions: {
    char_id: { id: '', name: '', nickname: '', des: '', behaviors: [] },
  },
  stageOptions: [],
  eventNames: [],
  storyKey: '',
  intro: '',
}

const DEFAULT_STORY_TEMPLATE_MODEL: GenerateStoryTemplateModel = {
  charIds: [],
  eventEffect: [],
  stageDes: [],
  des: [],
  behaviors: [],
  begin: '',
  intro: '',
  storyKey: '',
  numberOfStages: 1,
  conversionModel: [],
  eventNames: [],
  triggerLevel: [100, 200, 300],
}

const DEFAULT_CHAR_PROMPT_MODEL: GenerateCharPromptModel = {
  name: 'Sakura',
  hair: 'long straight hair',
  bodyshape: 'boxom',
  look: 'cute face',
  eyes: 'brown eyes',
  stageDes: [
    { scene: 'school', clothes: 'suit' },
    { scene: 'beach', clothes: 'swimsuit' },
  ],
}

const DEFAULT_CHAR_IMG_MODEL: CharImgModel = {
  name: '',
  stageOutput: [],
  avatarOutput: [],
  emoOutput: [],
}

function generateCharacterId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36)
}

function loadCache(key: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return null
  }
}

function setCache(key: string, value: Record<string, string>): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function hasAllKeys(obj: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k))
}

const panelVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export default function AdminPage() {
  const { t } = useTranslation()

  const [inputValue, setInputValue] = useState('')
  const [consoleMode, setConsoleMode] = useState(false)
  const [savedText, setSavedText] = useState('')
  const [toggleType, setToggleType] = useState<ToggleType>('')
  const [loading, setLoading] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const placeholder = useMemo(() => {
    if (consoleMode) return ''
    switch (toggleType) {
      case 'story':
        return JSON.stringify(DEFAULT_STORY_MODEL, null, 2)
      case 'char':
        return JSON.stringify(DEFAULT_CHAR_MODEL, null, 2)
      case 'template':
        return JSON.stringify(DEFAULT_STORY_TEMPLATE_MODEL, null, 2)
      case 'charPrompt':
        return JSON.stringify(DEFAULT_CHAR_PROMPT_MODEL, null, 2)
      case 'charImg':
        return t('message.generate_char_images_suggest', 'Generating images is a time-consuming process, please be patient')
      default:
        return ''
    }
  }, [consoleMode, toggleType, t])

  const scrollToBottom = useCallback(() => {
    const el = textareaRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [inputValue, scrollToBottom])

  const handleToggleConsole = useCallback(() => {
    setConsoleMode((prev) => {
      if (!prev) {
        setSavedText(inputValue)
        setInputValue('')
      } else {
        setInputValue(savedText)
      }
      return !prev
    })
  }, [inputValue, savedText])

  const appendNameCache = useCallback((name: string) => {
    const key = 'i18Name'
    const value = loadCache(key)
    if (!value) {
      setCache(key, { [name]: name })
    } else if (!Object.prototype.hasOwnProperty.call(value, name)) {
      value[name] = name
      setCache(key, value)
    }
  }, [])

  const handleSubmit = useCallback(
    async (type: 'story' | 'char') => {
      setToggleType(type)
      if (inputValue.trim().length === 0) return

      let submitObj: Record<string, unknown> | null = null
      try {
        const parsed = JSON.parse(inputValue)
        const keys =
          type === 'char'
            ? ['filterName', 'characterId', 'characterNickname', 'numberOfStages', 'gender']
            : ['charOptions', 'stageOptions', 'eventNames', 'storyKey', 'intro']

        if (typeof parsed !== 'object' || parsed === null) {
          submitObj = null
        } else {
          submitObj = parsed as Record<string, unknown>
          if (!hasAllKeys(submitObj, keys)) {
            submitObj = null
          }
        }
      } catch {
        setInputValue('')
        return
      }

      if (!submitObj) {
        setInputValue('')
        return
      }

      setLoading(true)
      try {
        // In v2, API calls would go through a service layer.
        // For now, we simulate the pipeline structure.
        console.log(`[StoryFactory] submit(${type})`, submitObj)
        setInputValue(
          JSON.stringify(
            { _status: 'submitted', type, payload: submitObj },
            null,
            2,
          ),
        )
      } catch (err) {
        setInputValue(`Generate Failed ... ${err}`)
      } finally {
        setLoading(false)
      }
    },
    [inputValue],
  )

  const handleGenerateStoryTemplate = useCallback(async () => {
    setToggleType('template')
    if (inputValue.length === 0) return

    try {
      const submitObj = JSON.parse(inputValue) as Record<string, unknown>
      if (!hasAllKeys(submitObj, Object.keys(DEFAULT_STORY_TEMPLATE_MODEL))) {
        setInputValue('')
        return
      }
      console.log('[StoryFactory] generateStoryTemplate', submitObj)
      setInputValue(JSON.stringify({ _status: 'template_generated', payload: submitObj }, null, 2))
    } catch (e) {
      setInputValue(`${e}`)
    }
  }, [inputValue])

  const handleGenerateCharPrompt = useCallback(async () => {
    setToggleType('charPrompt')
    if (inputValue.length === 0) return

    try {
      const submitObj = JSON.parse(inputValue) as Record<string, unknown>
      if (!hasAllKeys(submitObj, Object.keys(DEFAULT_CHAR_PROMPT_MODEL))) {
        const missingKey = Object.keys(DEFAULT_CHAR_PROMPT_MODEL).find(
          (k) => !Object.prototype.hasOwnProperty.call(submitObj, k),
        )
        setInputValue(`key ${missingKey ?? 'unknown'} missing.`)
        return
      }

      console.log('[StoryFactory] generateCharPrompt', submitObj)
      const lookValue = String(submitObj['look'] ?? '').toLowerCase()
      const gender = / man\b/.test(lookValue) ? 2 : 1

      const result = { ...submitObj, gender, _status: 'char_prompt_generated' }
      setInputValue(JSON.stringify(result, null, 2))
    } catch (e) {
      setInputValue(`${e}`)
    }
  }, [inputValue])

  const handleCreateCharImages = useCallback(async () => {
    setToggleType('charImg')
    if (inputValue.length === 0) return

    try {
      const submitObj = JSON.parse(inputValue) as Record<string, unknown>
      if (!hasAllKeys(submitObj, Object.keys(DEFAULT_CHAR_IMG_MODEL))) {
        const missingKey = Object.keys(DEFAULT_CHAR_IMG_MODEL).find(
          (k) => !Object.prototype.hasOwnProperty.call(submitObj, k),
        )
        setInputValue(`key ${missingKey ?? 'unknown'} is missing.`)
        return
      }

      setLoading(true)
      console.log('[StoryFactory] createCharImages', submitObj)

      const name = String(submitObj['name'] ?? '')
      const stageOutput = submitObj['stageOutput']
      const stageCount =
        typeof stageOutput === 'object' && stageOutput !== null
          ? Object.keys(stageOutput).length
          : 0

      const ret: GenerateCharModel = {
        ...DEFAULT_CHAR_MODEL,
        filterName: name,
        characterId: generateCharacterId(name),
        characterNickname: name,
        numberOfStages: stageCount,
        gender: (submitObj['gender'] as number) || 1,
      }
      setInputValue(JSON.stringify(ret, null, 2))
      appendNameCache(name)
    } catch (error) {
      setInputValue(`Generate Failed ... ${error}`)
    } finally {
      setLoading(false)
    }
  }, [inputValue, appendNameCache])

  const executeCmd = useCallback(
    async (cmd: string, _detail: string) => {
      console.log(`[Console] cmd=${cmd} detail=${_detail}`)
      switch (cmd) {
        case 'ls storys':
        case 'ls story':
        case 'ls chars':
        case 'ls char':
          setInputValue((prev) => prev + `[${cmd}] Listing data...\n`)
          break
        default:
          setInputValue((prev) => prev + `system: ${cmd} Command Not Found ...\n`)
          break
      }
    },
    [],
  )

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Enter' || !consoleMode) return
      const lines = inputValue.split('\n')
      if (lines.length < 2) return
      const lastLine = lines[lines.length - 2] ?? ''
      const cmds = lastLine.split(' ')
      if (cmds.length < 2) return
      const cmd = `${cmds[0]} ${cmds[1]}`
      const detail = cmds[2] ?? ''
      executeCmd(cmd, detail)
    },
    [consoleMode, inputValue, executeCmd],
  )

  const pipelineSteps = useMemo(
    () => [
      {
        key: 'charPrompt' as const,
        label: `1. ${t('message.generate_char_prompt_template', 'Generate Char Prompt')}`,
        icon: <Wand2 size={16} />,
        handler: handleGenerateCharPrompt,
      },
      {
        key: 'charImg' as const,
        label: `2. ${t('message.generate_char_images', 'Generate Char Images')}`,
        icon: <Image size={16} />,
        handler: handleCreateCharImages,
      },
      {
        key: 'char' as const,
        label: `3. ${t('message.generate_char', 'Generate Character')}`,
        icon: <UserPlus size={16} />,
        handler: () => handleSubmit('char'),
      },
      {
        key: 'template' as const,
        label: `4. ${t('message.generate_story_template', 'Generate Story Template')}`,
        icon: <ScrollText size={16} />,
        handler: handleGenerateStoryTemplate,
      },
      {
        key: 'story' as const,
        label: `5. ${t('message.generate_story', 'Generate Story')}`,
        icon: <BookOpen size={16} />,
        handler: () => handleSubmit('story'),
      },
    ],
    [t, handleGenerateCharPrompt, handleCreateCharImages, handleSubmit, handleGenerateStoryTemplate],
  )

  return (
    <div className="relative flex h-full w-full flex-col">
      <div
        className={cn(
          'mx-auto flex w-full max-w-[var(--ui-container-width)] flex-1 flex-col items-center gap-4 p-6',
          consoleMode && 'pt-4',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={consoleMode ? 'console' : 'normal'}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex w-full flex-1 flex-col items-center gap-4"
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyUp={handleKeyUp}
              placeholder={placeholder}
              className={cn(
                'w-full flex-1 resize-none rounded-xl border p-4 text-sm leading-relaxed transition-all focus:outline-none',
                'scrollbar-none',
              )}
              style={{
                minHeight: '45vh',
                background: consoleMode
                  ? '#0a0a0a'
                  : 'var(--ui-panel-glass)',
                borderColor: consoleMode
                  ? 'var(--ui-panel-glass-border)'
                  : 'var(--ui-border)',
                color: consoleMode ? '#00ff41' : 'var(--ui-text)',
                fontFamily: consoleMode
                  ? 'var(--ui-font-mono)'
                  : 'var(--ui-font-main)',
                backdropFilter: consoleMode ? 'none' : 'blur(12px)',
                boxShadow: consoleMode
                  ? 'inset 0 0 40px rgba(0, 255, 65, 0.05)'
                  : 'var(--ui-shadow-soft)',
              }}
            />

            {!consoleMode && (
              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                {pipelineSteps.map((step) => (
                  <button
                    key={step.key}
                    type="button"
                    disabled={loading}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-xs font-medium transition-all',
                      'min-w-[140px] hover:scale-[1.02] active:scale-[0.98]',
                      loading && 'pointer-events-none opacity-50',
                    )}
                    style={{
                      background:
                        toggleType === step.key
                          ? 'var(--ui-primary-soft)'
                          : 'var(--ui-panel-glass)',
                      borderColor:
                        toggleType === step.key
                          ? 'var(--ui-primary)'
                          : 'var(--ui-panel-glass-border)',
                      color:
                        toggleType === step.key
                          ? 'var(--ui-primary)'
                          : 'var(--ui-text)',
                      backdropFilter: 'blur(8px)',
                    }}
                    onClick={step.handler}
                  >
                    {step.icon}
                    <span className="truncate">{step.label}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--ui-muted)' }}
          >
            <Send size={14} className="animate-pulse" />
            <span>{t('message.loading', 'Processing...')}</span>
          </motion.div>
        )}
      </div>

      <button
        type="button"
        className={cn(
          'fixed right-8 top-[5%] z-[var(--z-hud)] flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium transition-all',
          'hover:scale-105 active:scale-95',
        )}
        style={{
          background: consoleMode
            ? 'rgba(0, 255, 65, 0.1)'
            : 'var(--ui-panel-glass)',
          borderColor: consoleMode
            ? 'rgba(0, 255, 65, 0.4)'
            : 'var(--ui-panel-glass-border)',
          color: consoleMode ? '#00ff41' : 'var(--ui-muted)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={handleToggleConsole}
      >
        <Terminal size={16} />
        <span>
          {t('message.console_mode', 'Console Mode')}{' '}
          {consoleMode ? 'ON' : 'OFF'}
        </span>
      </button>
    </div>
  )
}
