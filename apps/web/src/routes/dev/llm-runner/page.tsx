/** LlmRunnerPage - LLM Orchestrator with multi-provider support, streaming, benchmarking */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Send,
  FlaskConical,
  ScrollText,
  BarChart3,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  ChevronDown,
  Sparkles,
  Eye,
  RotateCcw,
  MessageSquare,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { downloadFile } from '@/lib/download'

const PERSIST_KEY = 'moyin_dev_llm_settings'
const TOKEN_KEY = 'moyin_api_token'

type ViewMode = 'tester' | 'logger' | 'stats'
type JsonViewMode = 'request' | 'response'
type TargetEndpoint = 'game-turn' | 'official'

interface ModelOption {
  value: string
  label: string
  recommended?: boolean
}

interface GameFrame {
  id: string
  speaker: string
  text: string
  canNext: boolean
}

interface GameTurnResponse {
  meta?: {
    conversation_id?: string
    response_id?: string
    candidate_id?: string
    protocolVersion?: string
    error?: { code: string; message: string; raw_content?: string }
  }
  frames?: GameFrame[]
  proposals?: unknown[]
  stageHints?: { bgKey?: string; bgmKey?: string }
  provider?: string
  model?: string
  text?: string
  conversation_id?: string
  [key: string]: unknown
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

interface ChatHistoryItem {
  role: 'Player' | 'AI'
  text: string
}

interface BenchmarkLog {
  id: string
  timestamp: string
  type: 'success' | 'error'
  provider: string
  model: string
  scenario: string
  latencyMs: number
  valid: boolean
  userPrompt: string
  responsePreview: string
  score: number | null
}

interface ScenarioTemplate {
  label: string
  system: string
  history: string
  user: string
}

const PROVIDERS = [
  { value: 'grok', label: 'Grok' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'chatgpt', label: 'ChatGPT' },
]

const FALLBACK_MODELS: Record<string, ModelOption[]> = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  ],
  grok: [
    { value: 'grok-3-mini', label: 'Grok 3 Mini' },
    { value: 'grok-2-1212', label: 'Grok 2' },
  ],
  ollama: [
    { value: 'ollama:qwen2.5:7b-instruct-q4_K_M', label: 'Qwen 2.5 7B' },
  ],
  chatgpt: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ],
}

const DEFAULT_SYSTEM = "You are a Galgame engine. Setting: modern city. Characters: [Lin Wan] mysterious girl, cool personality, hiding secrets; [Player] an ordinary person accidentally involved in an incident. Generate the next story based on player actions."
const DEFAULT_USER = "[Player] smiles and says to Xiaomei: \"The weather is really nice today.\""

const SCENARIO_TEMPLATES: Record<string, ScenarioTemplate> = {
  custom: { label: 'Custom', system: DEFAULT_SYSTEM, history: '', user: '' },
  scene_entry: {
    label: '1. Scene Entry',
    system: DEFAULT_SYSTEM,
    history: 'None (new game start)',
    user: '[System] Initialize scene: S1_Cafe_Entrance. Time: rainy evening. Goal: make the player notice Lin Wan.',
  },
  interaction: {
    label: '2. Standard Interaction',
    system: DEFAULT_SYSTEM,
    history: 'Player has met Lin Wan at the cafe.',
    user: '[Player] walks over and quietly asks: "Do you mind if I sit here?"',
  },
  event_trigger: {
    label: '3. Event Trigger',
    system: DEFAULT_SYSTEM,
    history: 'Player has been chatting with Lin Wan for a while, good atmosphere.',
    user: '[Player] says seriously: "Actually, I\'m also looking for clues about the \'Rainy Night\'. Maybe we can work together."',
  },
  choice_point: {
    label: '4. Choice Point',
    system: DEFAULT_SYSTEM,
    history: 'Lin Wan is about to leave, player faces a decision.',
    user: '[System] Critical node CP2 detected. Guide the player to choose: A. Follow her to the alley B. Stay in place.',
  },
}

const LANE_KEY_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'char_mei', label: 'Character: Xiaomei' },
  { value: 'char_riko', label: 'Character: Riko' },
  { value: 'h_lane', label: 'H-Lane (Special)' },
  { value: 'easter_preheat', label: 'Easter Egg' },
  { value: 'custom', label: 'Custom...' },
]

const panelVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.15 } },
}

function validateGameTurnResponse(data: unknown): ValidationResult {
  const errors: string[] = []
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Response is not an object'] }
  }

  const resp = data as Record<string, unknown>

  if (!resp['frames'] || !Array.isArray(resp['frames'])) {
    errors.push('Missing or invalid "frames" array')
  } else {
    const frames = resp['frames'] as Array<Record<string, unknown>>
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      if (frame) {
        if (!frame['id']) errors.push(`frames[${i}] missing "id"`)
        if (!frame['speaker']) errors.push(`frames[${i}] missing "speaker"`)
        if (typeof frame['text'] !== 'string') errors.push(`frames[${i}] missing "text"`)
      }
    }
  }

  if (!resp['meta'] || typeof resp['meta'] !== 'object') {
    errors.push('Missing "meta" object')
  }

  return { valid: errors.length === 0, errors }
}

export default function LlmRunnerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const responseEndRef = useRef<HTMLDivElement>(null)

  const [currentView, setCurrentView] = useState<ViewMode>('tester')
  const [targetEndpoint, setTargetEndpoint] = useState<TargetEndpoint>('game-turn')
  const [useMock, setUseMock] = useState(false)
  const [sessionMode, setSessionMode] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [provider, setProvider] = useState('gemini')
  const [model, setModel] = useState('gemini-2.5-flash')
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM)
  const [historySummary, setHistorySummary] = useState('Opening scene, player just met Xiaomei.')
  const [userPrompt, setUserPrompt] = useState(DEFAULT_USER)
  const [useStream, setUseStream] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState('custom')
  const [laneKey, setLaneKey] = useState('default')
  const [customLaneKey, setCustomLaneKey] = useState('')
  const [jsonViewMode, setJsonViewMode] = useState<JsonViewMode>('response')

  const [conversationId, setConversationId] = useState('')
  const [responseId, setResponseId] = useState('')

  const [response, setResponse] = useState<GameTurnResponse | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [lastRequestBody, setLastRequestBody] = useState<unknown>(null)
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([])
  const [benchmarkLogs, setBenchmarkLogs] = useState<BenchmarkLog[]>([])

  const [dynamicModels, setDynamicModels] = useState<Record<string, ModelOption[]>>({})
  const [fetchingModels, setFetchingModels] = useState(false)

  const effectiveLaneKey = useMemo(
    () => (laneKey === 'custom' ? customLaneKey || 'custom' : laneKey),
    [laneKey, customLaneKey],
  )

  const availableModels = useMemo(() => {
    const dynamic = dynamicModels[provider]
    if (dynamic && dynamic.length > 0) return dynamic
    return FALLBACK_MODELS[provider] ?? []
  }, [provider, dynamicModels])

  const loadSettings = useCallback(() => {
    try {
      const saved = localStorage.getItem(PERSIST_KEY)
      if (saved) {
        const data = JSON.parse(saved) as Record<string, unknown>
        if (typeof data['targetEndpoint'] === 'string') setTargetEndpoint(data['targetEndpoint'] as TargetEndpoint)
        if (typeof data['provider'] === 'string') setProvider(data['provider'] as string)
        if (typeof data['model'] === 'string') setModel(data['model'] as string)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const saveSettings = useCallback(() => {
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ targetEndpoint, provider, model }))
  }, [targetEndpoint, provider, model])

  const settingsLoaded = useRef(false)

  useEffect(() => {
    loadSettings()
    settingsLoaded.current = true
  }, [loadSettings])

  useEffect(() => {
    if (settingsLoaded.current) {
      saveSettings()
    }
  }, [saveSettings])

  useEffect(() => {
    const models = availableModels
    if (models.length > 0) {
      const exists = models.some((m) => m.value === model)
      if (!exists) {
        const first = models[0]
        if (first) setModel(first.value)
      }
    }
  }, [provider, availableModels, model])

  useEffect(() => {
    const tpl = SCENARIO_TEMPLATES[selectedScenario]
    if (tpl && selectedScenario !== 'custom') {
      if (tpl.system) setSystemPrompt(tpl.system)
      setHistorySummary(tpl.history)
      setUserPrompt(tpl.user)
    }
  }, [selectedScenario])

  const resetSession = useCallback(() => {
    setTurnCount(0)
    setChatHistory([])
    setConversationId('')
    setResponseId('')
    setHistorySummary(SCENARIO_TEMPLATES[selectedScenario]?.history ?? '')
  }, [selectedScenario])

  useEffect(() => {
    if (!sessionMode) resetSession()
  }, [sessionMode, resetSession])

  const fetchDynamicModels = useCallback(async () => {
    if (fetchingModels) return
    setFetchingModels(true)
    try {
      const baseUrl = import.meta.env?.['VITE_API_BASE_URL'] ?? ''
      const modelsUrl = `${baseUrl}/v1/models`
      const res = await fetch(modelsUrl, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = (await res.json()) as Record<string, Array<{ id?: string; model?: string; name?: string; is_recommended?: boolean }>>
        const parsed: Record<string, ModelOption[]> = {}
        for (const [key, models] of Object.entries(data)) {
          if (Array.isArray(models)) {
            parsed[key] = models.map((m) => ({
              value: m.id ?? m.model ?? m.name ?? '',
              label: `${m.is_recommended ? '* ' : ''}${m.name ?? m.id ?? m.model ?? ''}`,
              recommended: m.is_recommended,
            }))
          }
        }
        setDynamicModels(parsed)
      }
    } catch {
      // silently fail, use fallback models
    } finally {
      setFetchingModels(false)
    }
  }, [fetchingModels, token])

  useEffect(() => {
    fetchDynamicModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getMockResponse = useCallback(
    (turn: number): GameTurnResponse => {
      if (turn === 0) {
        return {
          meta: {
            conversation_id: 'mock-conv-001',
            response_id: 'mock-resp-001',
            candidate_id: 'mock-cand-001',
            protocolVersion: 'v1',
          },
          frames: [
            {
              id: 'mock-f1',
              speaker: 'Xiaomei',
              text: 'Hmph, so what if the weather is nice? Have you finished your summer homework? Don\'t think good weather means you can escape reality.',
              canNext: true,
            },
          ],
          proposals: [],
          stageHints: { bgKey: 'bg_classroom_sunny_afternoon', bgmKey: 'bgm_daily_relax' },
          provider: 'mock',
          model: 'local-mock',
        }
      }
      return {
        meta: {
          conversation_id: 'mock-conv-001',
          response_id: `mock-resp-00${turn + 1}`,
          candidate_id: `mock-cand-00${turn + 1}`,
          protocolVersion: 'v1',
        },
        frames: [
          {
            id: `mock-f${turn}-1`,
            speaker: 'Xiaomei',
            text: `(Turn ${turn}) Oh really? And then? Anything else you want to say?`,
            canNext: true,
          },
          {
            id: `mock-f${turn}-2`,
            speaker: 'Riko',
            text: '......(continues reading, completely ignoring your noise)',
            canNext: true,
          },
        ],
        proposals: [],
        stageHints: {},
        provider: 'mock',
        model: 'local-mock',
      }
    },
    [],
  )

  const submit = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    setValidationResult(null)
    localStorage.setItem(TOKEN_KEY, token)

    const startTime = Date.now()
    const currentUserPrompt = userPrompt
    let localResponse: GameTurnResponse | null = null
    let localValidation: ValidationResult | null = null

    try {
      if (useMock) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const mockData = getMockResponse(turnCount)
        localResponse = mockData
        localValidation = validateGameTurnResponse(mockData)
        setResponse(mockData)
        setValidationResult(localValidation)
      } else {
        const baseUrl = import.meta.env?.['VITE_API_BASE_URL'] ?? ''
        let url = `${baseUrl}/v1/game/turn`

        if (targetEndpoint === 'official') {
          const endpointMap: Record<string, string> = {
            gemini: `${baseUrl}/v1/official/gemini`,
            grok: `${baseUrl}/v1/official/grok`,
            ollama: `${baseUrl}/v1/official/ollama`,
            chatgpt: `${baseUrl}/v1/official/chatgpt`,
          }
          url = endpointMap[provider] ?? url
        }

        let body: Record<string, unknown>

        if (targetEndpoint === 'official') {
          if (provider === 'grok') {
            body = {
              messages: [{ role: 'user', content: userPrompt }],
              model,
              stream: useStream,
            }
          } else if (provider === 'gemini') {
            body = { message: userPrompt, model, stream: useStream }
          } else if (provider === 'ollama') {
            body = {
              system: systemPrompt,
              message: userPrompt,
              model,
              stream: useStream,
              conversation_id: sessionMode ? conversationId : '',
            }
          } else {
            body = {
              message: userPrompt,
              model,
              stream: useStream,
              conversation_id: sessionMode ? conversationId : '',
            }
          }
        } else {
          body = {
            provider,
            model,
            system_prompt: systemPrompt,
            history_summary: historySummary,
            user_prompt: userPrompt,
            stream: useStream,
            conversation_id: conversationId || undefined,
            response_id: responseId || undefined,
            laneKey: effectiveLaneKey,
          }
        }

        setLastRequestBody(body)

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({ detail: 'Request failed' }))) as { detail?: string }
          throw new Error(errData.detail ?? 'Request failed')
        }

        if (useStream) {
          const reader = res.body?.getReader()
          if (!reader) throw new Error('ReadableStream not supported')

          const decoder = new TextDecoder()
          let aiFullText = ''
          let finalCid = ''

          setResponse({
            provider,
            model,
            text: '',
            frames: [{ id: 'streaming', speaker: 'AI', text: '...', canNext: false }],
          })

          let reading = true
          while (reading) {
            const { done, value } = await reader.read()
            if (done) {
              reading = false
              break
            }

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.slice(6)) as { content?: string; conversation_id?: string }
                  if (parsed.content) {
                    aiFullText += parsed.content
                    setResponse((prev) => {
                      if (!prev) return prev
                      const frames = prev.frames ? [...prev.frames] : []
                      const firstFrame = frames[0]
                      if (firstFrame) {
                        frames[0] = { ...firstFrame, text: aiFullText }
                      }
                      return { ...prev, text: aiFullText, frames }
                    })
                  }
                  if (parsed.conversation_id) {
                    finalCid = parsed.conversation_id
                  }
                } catch {
                  // partial chunk, skip
                }
              }
            }
          }

          localResponse = {
            provider,
            model,
            text: aiFullText,
            conversation_id: finalCid,
            frames: [{ id: 'streaming', speaker: 'AI', text: aiFullText, canNext: true }],
          }
          localValidation = { valid: true, errors: [] }

          setResponse((prev) => {
            if (!prev) return prev
            const frames = prev.frames ? [...prev.frames] : []
            const firstFrame = frames[0]
            if (firstFrame) {
              frames[0] = { ...firstFrame, canNext: true }
            }
            return { ...prev, conversation_id: finalCid, frames }
          })
          setValidationResult(localValidation)
        } else {
          const data = (await res.json()) as GameTurnResponse
          localResponse = data
          localValidation = targetEndpoint === 'game-turn'
            ? validateGameTurnResponse(data)
            : { valid: true, errors: [] }
          setResponse(data)
          setValidationResult(localValidation)
        }
      }

      // Post-response processing (use local variables, not stale state)
      if (localResponse) {
        let aiText = ''
        if (localResponse.frames) {
          aiText = localResponse.frames.map((f) => `${f.speaker}: ${f.text}`).join('\n')
        } else if (typeof localResponse.text === 'string') {
          aiText = localResponse.text
        }

        const capturedCid =
          (localResponse.conversation_id as string) ??
          localResponse.meta?.conversation_id ??
          ''
        if (capturedCid) {
          setConversationId(capturedCid)
        }

        setChatHistory((prev) => [
          ...prev,
          { role: 'Player', text: currentUserPrompt },
          { role: 'AI', text: aiText },
        ])

        if (sessionMode) {
          setTurnCount((c) => c + 1)
          const newEntry = `\n[Turn ${turnCount + 1}]\nPlayer: ${currentUserPrompt}\nAI: ${aiText}`
          setHistorySummary((prev) => prev + newEntry)
          setUserPrompt('')
        }
      }

      const latency = Date.now() - startTime
      const logEntry: BenchmarkLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: localValidation?.valid !== false ? 'success' : 'error',
        provider,
        model,
        scenario: selectedScenario,
        latencyMs: latency,
        valid: localValidation?.valid !== false,
        userPrompt: currentUserPrompt.slice(0, 100),
        responsePreview: localResponse?.frames?.[0]?.text?.slice(0, 100) ?? '',
        score: null,
      }
      setBenchmarkLogs((prev) => [logEntry, ...prev].slice(0, 200))
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)

      const latency = Date.now() - startTime
      const logEntry: BenchmarkLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type: 'error',
        provider,
        model,
        scenario: selectedScenario,
        latencyMs: latency,
        valid: false,
        userPrompt: currentUserPrompt.slice(0, 100),
        responsePreview: message,
        score: null,
      }
      setBenchmarkLogs((prev) => [logEntry, ...prev].slice(0, 200))
    } finally {
      setLoading(false)
    }
  }, [
    token,
    userPrompt,
    useMock,
    getMockResponse,
    turnCount,
    provider,
    model,
    systemPrompt,
    historySummary,
    useStream,
    targetEndpoint,
    sessionMode,
    conversationId,
    responseId,
    effectiveLaneKey,
    selectedScenario,
  ])

  const handleExportLogs = useCallback(() => {
    downloadFile(
      JSON.stringify(benchmarkLogs, null, 2),
      `moyin_llm_logs_${Date.now()}.json`,
      'application/json',
    )
  }, [benchmarkLogs])

  const handleExportCsv = useCallback(() => {
    const header = 'timestamp,provider,model,scenario,latencyMs,valid,type'
    const rows = benchmarkLogs.map(
      (l) => `${l.timestamp},${l.provider},${l.model},${l.scenario},${l.latencyMs},${l.valid},${l.type}`,
    )
    downloadFile([header, ...rows].join('\n'), `moyin_llm_stats_${Date.now()}.csv`, 'text/csv')
  }, [benchmarkLogs])

  const handleClearLogs = useCallback(() => {
    setBenchmarkLogs([])
  }, [])

  const handleScoreUpdate = useCallback((logId: string, score: number | null) => {
    setBenchmarkLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, score } : l)),
    )
  }, [])

  const successCount = useMemo(
    () => benchmarkLogs.filter((l) => l.type === 'success').length,
    [benchmarkLogs],
  )
  const errorCount = useMemo(
    () => benchmarkLogs.filter((l) => l.type === 'error').length,
    [benchmarkLogs],
  )
  const avgLatency = useMemo(() => {
    if (benchmarkLogs.length === 0) return 0
    return Math.round(benchmarkLogs.reduce((sum, l) => sum + l.latencyMs, 0) / benchmarkLogs.length)
  }, [benchmarkLogs])

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden"
      style={{ color: 'var(--ui-text)', zIndex: 'var(--z-modal)' }}
    >
      <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-4 overflow-hidden p-5">
        {/* Header */}
        <header
          className="flex items-center justify-between border-b-2 pb-3"
          style={{ borderColor: 'var(--ui-panel-subtle)' }}
        >
          <div>
            <h1
              className="m-0 text-2xl font-bold"
              style={{
                fontFamily: 'var(--ui-font-special)',
                background: 'var(--ui-gradient-primary)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('message.llm_orchestrator', 'LLM Orchestrator')}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--ui-muted)', fontFamily: 'var(--ui-font-mono)' }}>
              Target:
              <select
                value={targetEndpoint}
                onChange={(e) => setTargetEndpoint(e.target.value as TargetEndpoint)}
                className="rounded border px-2 py-0.5 text-xs"
                style={{
                  background: 'var(--ui-panel-subtle)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-primary)',
                  fontFamily: 'var(--ui-font-mono)',
                }}
              >
                <option value="game-turn">/v1/game/turn</option>
                <option value="official">/v1/official/*</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div
              className="flex gap-0.5 rounded-full border p-1"
              style={{
                background: 'var(--ui-panel-subtle)',
                borderColor: 'var(--ui-panel-glass-border)',
              }}
            >
              {[
                { key: 'tester' as ViewMode, label: t('message.llm_tester', 'Tester'), icon: <FlaskConical size={14} /> },
                { key: 'logger' as ViewMode, label: t('message.llm_logs', 'Logs'), icon: <ScrollText size={14} />, badge: benchmarkLogs.length },
                { key: 'stats' as ViewMode, label: t('message.llm_stats', 'Stats'), icon: <BarChart3 size={14} /> },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all',
                    currentView === tab.key ? 'shadow-md' : 'bg-transparent',
                  )}
                  style={{
                    background: currentView === tab.key ? 'var(--ui-panel)' : 'transparent',
                    color: currentView === tab.key ? 'var(--ui-primary)' : 'var(--ui-muted)',
                  }}
                  onClick={() => setCurrentView(tab.key)}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className="ml-1 rounded-full px-1.5 py-0.5 text-[10px]"
                      style={{ background: 'var(--ui-panel-subtle)', color: 'var(--ui-text)' }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Toggles */}
            <ToggleChip
              label={t('message.session_mode', 'Session')}
              checked={sessionMode}
              onChange={setSessionMode}
            />
            {sessionMode && (
              <button
                className="flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
                style={{
                  background: 'color-mix(in srgb, var(--ui-danger) 10%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--ui-danger) 20%, transparent)',
                  color: 'var(--ui-danger)',
                }}
                onClick={resetSession}
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
            <ToggleChip
              label={t('message.mock_mode', 'Mock')}
              checked={useMock}
              onChange={setUseMock}
              variant="success"
            />

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border transition-all hover:rotate-90"
              style={{
                background: 'var(--ui-panel-glass)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-muted)',
              }}
              onClick={() => navigate(-1)}
              title="Go Back"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <AnimatePresence mode="wait">
          {currentView === 'tester' && (
            <motion.div
              key="tester"
              className="flex min-h-0 flex-1 gap-5"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Left Panel: Request Form */}
              <section className="flex w-[380px] min-w-[380px] flex-col">
                <div
                  className="glass-panel flex flex-1 flex-col overflow-hidden rounded-2xl p-5"
                >
                  <h2
                    className="mb-3 flex items-center gap-2 border-b-2 pb-2 text-lg font-bold"
                    style={{
                      color: 'var(--ui-text)',
                      borderColor: 'var(--ui-panel-subtle)',
                    }}
                  >
                    <Sparkles size={18} style={{ color: 'var(--ui-primary)' }} />
                    {t('message.llm_request_params', 'Request Params')}
                  </h2>

                  <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-2">
                    {/* Token */}
                    <FormGroup label={t('message.llm_auth_token', 'Auth Token')}>
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="sk-..."
                        className="w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none"
                        style={{
                          background: 'var(--ui-panel-subtle)',
                          borderColor: 'var(--ui-border)',
                          color: 'var(--ui-text)',
                        }}
                      />
                    </FormGroup>

                    {/* Scenario */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormGroup label={t('message.test_scenario', 'Scenario')} fullWidth>
                        <StyledSelect
                          value={selectedScenario}
                          options={Object.entries(SCENARIO_TEMPLATES).map(([k, v]) => ({
                            value: k,
                            label: v.label,
                          }))}
                          onChange={setSelectedScenario}
                        />
                      </FormGroup>

                      <FormGroup label="Provider">
                        <StyledSelect
                          value={provider}
                          options={PROVIDERS}
                          onChange={setProvider}
                        />
                      </FormGroup>

                      <FormGroup label="Model">
                        <StyledSelect
                          value={model}
                          options={availableModels.map((m) => ({ value: m.value, label: m.label }))}
                          onChange={setModel}
                        />
                      </FormGroup>

                      <FormGroup label="Lane Key">
                        <StyledSelect
                          value={laneKey}
                          options={LANE_KEY_OPTIONS}
                          onChange={setLaneKey}
                        />
                        {laneKey === 'custom' && (
                          <input
                            type="text"
                            value={customLaneKey}
                            onChange={(e) => setCustomLaneKey(e.target.value)}
                            placeholder="custom_lane_key"
                            className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                            style={{
                              background: 'var(--ui-panel-subtle)',
                              borderColor: 'var(--ui-border)',
                              color: 'var(--ui-text)',
                            }}
                          />
                        )}
                      </FormGroup>
                    </div>

                    {/* Stream toggle */}
                    <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: 'var(--ui-text)' }}>
                      <input
                        type="checkbox"
                        checked={useStream}
                        onChange={(e) => setUseStream(e.target.checked)}
                        className="accent-[var(--ui-primary)]"
                      />
                      Stream Response
                    </label>

                    {/* System prompt */}
                    <FormGroup label="System Context">
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-lg border px-3 py-2 text-sm"
                        style={{
                          background: 'var(--ui-panel-subtle)',
                          borderColor: 'var(--ui-border)',
                          color: 'var(--ui-text)',
                          fontFamily: 'var(--ui-font-mono)',
                        }}
                      />
                    </FormGroup>

                    {/* History */}
                    <FormGroup label="History Summary">
                      <textarea
                        value={historySummary}
                        onChange={(e) => setHistorySummary(e.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-lg border px-3 py-2 text-sm"
                        style={{
                          background: 'var(--ui-panel-subtle)',
                          borderColor: 'var(--ui-border)',
                          color: 'var(--ui-text)',
                          fontFamily: 'var(--ui-font-mono)',
                        }}
                      />
                    </FormGroup>

                    {/* User prompt */}
                    <FormGroup label={t('message.player_input', 'Player Input')} highlight>
                      <textarea
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        rows={3}
                        placeholder="User action..."
                        className="w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none"
                        style={{
                          background: 'var(--ui-panel-subtle)',
                          borderColor: 'var(--ui-border)',
                          color: 'var(--ui-text)',
                          fontFamily: 'var(--ui-font-mono)',
                        }}
                      />
                    </FormGroup>

                    {/* Submit */}
                    <div className="mt-2 border-t border-dashed pt-4" style={{ borderColor: 'var(--ui-border)' }}>
                      <button
                        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold transition-all disabled:opacity-50"
                        style={{
                          background: 'var(--ui-gradient-primary)',
                          color: '#fff',
                        }}
                        disabled={loading}
                        onClick={submit}
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {t('message.generating', 'Generating...')}
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            {t('message.send_request', 'Send Request')}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Error */}
                    {error && (
                      <div
                        className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                        style={{
                          background: 'color-mix(in srgb, var(--ui-danger) 8%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--ui-danger) 20%, transparent)',
                          color: 'var(--ui-danger)',
                        }}
                      >
                        <XCircle size={16} className="mt-0.5 flex-shrink-0" />
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Right Panel: Response Preview */}
              <section className="flex min-w-0 flex-1 flex-col gap-5">
                <div className="glass-panel flex flex-1 flex-col overflow-hidden rounded-2xl p-5">
                  <h2
                    className="mb-3 flex items-center gap-2 border-b-2 pb-2 text-lg font-bold"
                    style={{ color: 'var(--ui-text)', borderColor: 'var(--ui-panel-subtle)' }}
                  >
                    <Eye size={18} style={{ color: 'var(--ui-primary)' }} />
                    Visual Preview
                  </h2>

                  {/* Chat History */}
                  {sessionMode && chatHistory.length > 0 && (
                    <div
                      className="mb-3 max-h-[200px] overflow-y-auto rounded-xl border p-4"
                      style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
                    >
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} className="mb-3 text-sm leading-relaxed">
                          <span
                            className="mr-2 inline-block rounded px-2 py-0.5 text-xs font-bold"
                            style={{
                              background:
                                msg.role === 'Player'
                                  ? 'rgba(59,130,246,0.1)'
                                  : 'color-mix(in srgb, var(--ui-primary) 10%, transparent)',
                              color:
                                msg.role === 'Player' ? '#3b82f6' : 'var(--ui-primary)',
                            }}
                          >
                            {msg.role}:
                          </span>
                          <span className="block mt-1 pl-1" style={{ color: 'var(--ui-text)' }}>
                            {msg.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto pr-2">
                    {response ? (
                      <>
                        {/* Validation Banner */}
                        {validationResult && (
                          <div
                            className="mb-4 flex flex-col gap-2 rounded-xl border p-3 text-sm"
                            style={{
                              background: validationResult.valid
                                ? 'rgba(16,185,129,0.1)'
                                : 'rgba(244,63,94,0.1)',
                              borderColor: validationResult.valid
                                ? 'rgba(16,185,129,0.25)'
                                : 'rgba(244,63,94,0.25)',
                              color: validationResult.valid ? '#34d399' : 'var(--ui-danger)',
                            }}
                          >
                            <div className="flex items-center gap-2 font-bold">
                              {validationResult.valid ? (
                                <CheckCircle2 size={16} />
                              ) : (
                                <XCircle size={16} />
                              )}
                              {validationResult.valid
                                ? t('message.llm_schema_validated', 'Schema Validated')
                                : t('message.llm_validation_failed', 'Validation Failed')}
                            </div>
                            {!validationResult.valid && validationResult.errors.length > 0 && (
                              <div
                                className="rounded-md p-2 text-xs"
                                style={{
                                  background: 'rgba(0,0,0,0.15)',
                                  fontFamily: 'var(--ui-font-mono)',
                                }}
                              >
                                {validationResult.errors.map((err, i) => (
                                  <div key={i}>{err}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {validationResult?.valid && (
                          <>
                            {/* Stage Hints */}
                            {response.stageHints && (response.stageHints.bgKey || response.stageHints.bgmKey) && (
                              <div className="mb-4 flex flex-wrap gap-2">
                                {response.stageHints.bgKey && (
                                  <span
                                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                                    style={{
                                      background: '#f3e8ff',
                                      color: '#9333ea',
                                      borderColor: '#e9d5ff',
                                    }}
                                  >
                                    BG: {response.stageHints.bgKey}
                                  </span>
                                )}
                                {response.stageHints.bgmKey && (
                                  <span
                                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                                    style={{
                                      background: '#e0e7ff',
                                      color: '#4f46e5',
                                      borderColor: '#c7d2fe',
                                    }}
                                  >
                                    BGM: {response.stageHints.bgmKey}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Frames */}
                            {response.frames?.map((frame) => (
                              <div key={frame.id} className="mb-6 flex gap-4">
                                <div className="flex w-[60px] flex-col items-center">
                                  <div
                                    className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold"
                                    style={{
                                      background: 'var(--ui-panel-subtle)',
                                      borderColor: 'var(--ui-border)',
                                      color: 'var(--ui-muted)',
                                    }}
                                  >
                                    {frame.speaker[0] ?? '?'}
                                  </div>
                                  <span
                                    className="rounded-full border px-2 py-0.5 text-center text-xs font-bold"
                                    style={{
                                      background: 'var(--ui-panel-subtle)',
                                      borderColor: 'var(--ui-border)',
                                      color: 'var(--ui-primary)',
                                    }}
                                  >
                                    {frame.speaker}
                                  </span>
                                </div>
                                <div
                                  className="flex-1 rounded-2xl rounded-tl border p-4 leading-relaxed"
                                  style={{
                                    background: 'var(--ui-panel-subtle)',
                                    borderColor: 'var(--ui-border)',
                                    color: 'var(--ui-text)',
                                    whiteSpace: 'pre-wrap',
                                  }}
                                >
                                  {frame.text}
                                </div>
                              </div>
                            ))}

                            {/* Proposals */}
                            {response.proposals && response.proposals.length > 0 && (
                              <div
                                className="mt-6 border-t border-dashed pt-4"
                                style={{ borderColor: 'var(--ui-border)' }}
                              >
                                <h4
                                  className="mb-3 text-center text-xs font-bold uppercase tracking-wider"
                                  style={{ color: 'var(--ui-muted)' }}
                                >
                                  {t('message.llm_state_updates', 'State Updates')}
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {response.proposals.map((prop, idx) => (
                                    <div
                                      key={idx}
                                      className="overflow-hidden rounded-lg border p-3 text-xs"
                                      style={{
                                        background: 'var(--ui-panel-subtle)',
                                        borderColor: 'var(--ui-border)',
                                        color: 'var(--ui-muted)',
                                        fontFamily: 'var(--ui-font-mono)',
                                        whiteSpace: 'pre-wrap',
                                      }}
                                    >
                                      {JSON.stringify(prop)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {validationResult && !validationResult.valid && (
                          <div
                            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center"
                            style={{
                              borderColor: 'var(--ui-border)',
                              color: 'var(--ui-muted)',
                              background: 'var(--ui-panel-subtle)',
                            }}
                          >
                            <p>{t('message.llm_data_error', 'Data format error')}</p>
                            <p className="text-xs opacity-80">
                              {t('message.llm_check_raw_json', 'Check raw JSON below')}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div
                        className="flex flex-1 flex-col items-center justify-center gap-4 opacity-80"
                        style={{ color: 'var(--ui-placeholder)' }}
                      >
                        <MessageSquare size={48} strokeWidth={1} />
                        <p>{t('message.llm_waiting_response', 'Waiting for response...')}</p>
                      </div>
                    )}
                    <div ref={responseEndRef} />
                  </div>
                </div>

                {/* Raw JSON Panel */}
                <div
                  className="glass-panel flex h-[200px] min-h-[200px] flex-col rounded-2xl p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div
                      className="flex gap-1 rounded-md p-0.5"
                      style={{ background: 'var(--ui-panel-subtle)' }}
                    >
                      <button
                        className={cn('rounded px-3 py-1 text-xs font-semibold transition-all')}
                        style={{
                          background: jsonViewMode === 'request' ? 'var(--ui-primary)' : 'transparent',
                          color: jsonViewMode === 'request' ? 'var(--ui-inverse)' : 'var(--ui-muted)',
                        }}
                        onClick={() => setJsonViewMode('request')}
                      >
                        Request
                      </button>
                      <button
                        className={cn('rounded px-3 py-1 text-xs font-semibold transition-all')}
                        style={{
                          background: jsonViewMode === 'response' ? 'var(--ui-primary)' : 'transparent',
                          color: jsonViewMode === 'response' ? 'var(--ui-inverse)' : 'var(--ui-muted)',
                        }}
                        onClick={() => setJsonViewMode('response')}
                      >
                        Response
                      </button>
                    </div>
                    {response && jsonViewMode === 'response' && (
                      <span
                        className="rounded px-2 py-0.5 text-xs"
                        style={{ background: 'var(--ui-panel-subtle)', color: 'var(--ui-primary)' }}
                      >
                        {response.frames?.length ?? 0} {t('message.llm_frames', 'frames')}
                      </span>
                    )}
                  </div>
                  <pre
                    className="flex-1 overflow-auto rounded-xl border p-3 text-xs"
                    style={{
                      background: 'var(--ui-panel-subtle)',
                      borderColor: 'var(--ui-border)',
                      color: 'var(--ui-text)',
                      fontFamily: 'var(--ui-font-mono)',
                    }}
                  >
                    {jsonViewMode === 'request'
                      ? lastRequestBody
                        ? JSON.stringify(lastRequestBody, null, 2)
                        : t('message.llm_no_request_data', 'No request data')
                      : response
                        ? JSON.stringify(response, null, 2)
                        : '// Response Data'}
                  </pre>
                </div>
              </section>
            </motion.div>
          )}

          {/* Logger View */}
          {currentView === 'logger' && (
            <motion.div
              key="logger"
              className="flex flex-1 flex-col overflow-hidden"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="glass-panel flex flex-1 flex-col overflow-hidden rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    className="flex items-center gap-2 text-lg font-bold"
                    style={{ color: 'var(--ui-text)' }}
                  >
                    <ScrollText size={18} style={{ color: 'var(--ui-primary)' }} />
                    Benchmark Logs ({benchmarkLogs.length})
                  </h2>
                  <div className="flex gap-2">
                    <SmallButton icon={<Download size={14} />} label="Export JSON" onClick={handleExportLogs} />
                    <SmallButton icon={<Trash2 size={14} />} label="Clear" onClick={handleClearLogs} danger />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {benchmarkLogs.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center gap-4 py-16 opacity-60"
                      style={{ color: 'var(--ui-muted)' }}
                    >
                      <ScrollText size={40} strokeWidth={1} />
                      <p className="text-sm">No logs yet. Run some tests to see results.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {benchmarkLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 rounded-lg border p-3"
                          style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
                        >
                          {log.type === 'success' ? (
                            <CheckCircle2 size={16} className="flex-shrink-0 text-emerald-500" />
                          ) : (
                            <XCircle size={16} className="flex-shrink-0 text-red-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ui-text)' }}>
                              <span className="font-semibold">{log.provider}/{log.model}</span>
                              <span style={{ color: 'var(--ui-muted)' }}>{log.scenario}</span>
                              <span style={{ color: 'var(--ui-muted)' }}>{log.latencyMs}ms</span>
                            </div>
                            <div
                              className="mt-1 truncate text-xs"
                              style={{ color: 'var(--ui-muted)' }}
                            >
                              {log.responsePreview || log.userPrompt}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                className="transition-all hover:scale-110"
                                onClick={() => handleScoreUpdate(log.id, log.score === s ? null : s)}
                              >
                                <Star
                                  size={14}
                                  fill={log.score !== null && log.score >= s ? 'var(--ui-primary)' : 'none'}
                                  style={{
                                    color: log.score !== null && log.score >= s ? 'var(--ui-primary)' : 'var(--ui-border)',
                                  }}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-[10px]" style={{ color: 'var(--ui-muted)' }}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats View */}
          {currentView === 'stats' && (
            <motion.div
              key="stats"
              className="flex flex-1 flex-col overflow-hidden"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="glass-panel flex flex-1 flex-col overflow-hidden rounded-2xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    className="flex items-center gap-2 text-lg font-bold"
                    style={{ color: 'var(--ui-text)' }}
                  >
                    <BarChart3 size={18} style={{ color: 'var(--ui-primary)' }} />
                    Benchmark Statistics
                  </h2>
                  <div className="flex gap-2">
                    <SmallButton icon={<Download size={14} />} label="CSV" onClick={handleExportCsv} />
                    <SmallButton icon={<Download size={14} />} label="JSON" onClick={handleExportLogs} />
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="mb-6 grid grid-cols-4 gap-4">
                  <StatCard label="Total Tests" value={benchmarkLogs.length} />
                  <StatCard label="Success" value={successCount} color="var(--ui-success)" />
                  <StatCard label="Errors" value={errorCount} color="var(--ui-danger)" />
                  <StatCard label="Avg Latency" value={`${avgLatency}ms`} />
                </div>

                {/* Per-Provider Breakdown */}
                <h3
                  className="mb-3 text-sm font-bold uppercase tracking-wider"
                  style={{ color: 'var(--ui-muted)' }}
                >
                  By Provider
                </h3>
                <div className="flex-1 overflow-y-auto">
                  {PROVIDERS.map((p) => {
                    const providerLogs = benchmarkLogs.filter((l) => l.provider === p.value)
                    if (providerLogs.length === 0) return null
                    const successRate = providerLogs.length > 0
                      ? Math.round((providerLogs.filter((l) => l.type === 'success').length / providerLogs.length) * 100)
                      : 0
                    const providerAvgLatency = providerLogs.length > 0
                      ? Math.round(providerLogs.reduce((sum, l) => sum + l.latencyMs, 0) / providerLogs.length)
                      : 0
                    const scoredLogs = providerLogs.filter((l) => l.score !== null)
                    const avgScore = scoredLogs.length > 0
                      ? (scoredLogs.reduce((sum, l) => sum + (l.score ?? 0), 0) / scoredLogs.length).toFixed(1)
                      : '-'

                    return (
                      <div
                        key={p.value}
                        className="mb-3 rounded-lg border p-4"
                        style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>
                            {p.label}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--ui-muted)' }}>
                            {providerLogs.length} tests
                          </span>
                        </div>
                        <div className="flex gap-6 text-xs" style={{ color: 'var(--ui-muted)' }}>
                          <span>
                            Success:{' '}
                            <span className="font-semibold" style={{ color: 'var(--ui-text)' }}>
                              {successRate}%
                            </span>
                          </span>
                          <span>
                            Avg Latency:{' '}
                            <span className="font-semibold" style={{ color: 'var(--ui-text)' }}>
                              {providerAvgLatency}ms
                            </span>
                          </span>
                          <span>
                            Avg Score:{' '}
                            <span className="font-semibold" style={{ color: 'var(--ui-text)' }}>
                              {avgScore}
                            </span>
                          </span>
                        </div>
                        {/* Simple bar visualization */}
                        <div
                          className="mt-2 h-2 overflow-hidden rounded-full"
                          style={{ background: 'var(--ui-border)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${successRate}%`,
                              background: 'var(--ui-primary)',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                  {benchmarkLogs.length === 0 && (
                    <div
                      className="flex flex-col items-center justify-center gap-4 py-16 opacity-60"
                      style={{ color: 'var(--ui-muted)' }}
                    >
                      <BarChart3 size={40} strokeWidth={1} />
                      <p className="text-sm">No statistics yet. Run some tests to see data.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function FormGroup({
  label,
  children,
  highlight,
  fullWidth,
}: {
  label: string
  children: React.ReactNode
  highlight?: boolean
  fullWidth?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'col-span-2')}>
      <label
        className="text-xs font-bold uppercase tracking-wider"
        style={{ color: highlight ? '#3b82f6' : 'var(--ui-muted)' }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function StyledSelect({
  value,
  options,
  onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm"
        style={{
          background: 'var(--ui-panel-subtle)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--ui-muted)' }}
      />
    </div>
  )
}

function ToggleChip({
  label,
  checked,
  onChange,
  variant,
}: {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
  variant?: 'success'
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 transition-all hover:opacity-90">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="hidden"
      />
      <span
        className="relative inline-flex h-5 w-9 rounded-full border transition-all"
        style={{
          background: checked
            ? variant === 'success'
              ? 'var(--ui-success)'
              : 'var(--ui-primary)'
            : 'var(--ui-panel-subtle)',
          borderColor: checked
            ? variant === 'success'
              ? 'var(--ui-success)'
              : 'var(--ui-primary)'
            : 'var(--ui-border)',
        }}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </span>
      <span className="text-xs font-medium" style={{ color: 'var(--ui-text)' }}>
        {label}
      </span>
    </label>
  )
}

function SmallButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
      style={{
        background: danger
          ? 'color-mix(in srgb, var(--ui-danger) 10%, transparent)'
          : 'var(--ui-panel)',
        borderColor: danger
          ? 'color-mix(in srgb, var(--ui-danger) 20%, transparent)'
          : 'var(--ui-border)',
        color: danger ? 'var(--ui-danger)' : 'var(--ui-text)',
      }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div
      className="rounded-xl border p-4 text-center"
      style={{ background: 'var(--ui-panel-subtle)', borderColor: 'var(--ui-border)' }}
    >
      <div
        className="mb-1 text-2xl font-bold"
        style={{ color: color ?? 'var(--ui-text)' }}
      >
        {value}
      </div>
      <div className="text-xs font-medium" style={{ color: 'var(--ui-muted)' }}>
        {label}
      </div>
    </div>
  )
}
