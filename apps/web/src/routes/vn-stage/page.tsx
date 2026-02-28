import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  StageViewport,
  ChoiceOverlay,
  CharSelect,
  EndingPanel,
  ExitDialog,
  SystemMenu,
  QuickSaveLoadDrawer,
  useVnEngine,
  useVnStageUI,
  DialogueBox,
  BacklogPanel,
  CommandComposer,
} from '@/features/vn-stage'
import { useVnStageStore } from '@/features/vn-stage/store'
import { usePackRegistryStore } from '@/features/story-import/stores/usePackRegistryStore'

/**
 * Shared style constants for stage UI buttons
 */
const STAGE_QUICK_ACTION_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  padding: 'var(--space-2) var(--space-3)',
  maxWidth: '96px',
  overflow: 'hidden',
  borderRadius: 'var(--ui-radius-sm)',
  background: 'color-mix(in srgb, var(--ui-panel) 55%, transparent)',
  border: '1px solid var(--ui-imperial-gold-soft, rgba(255,215,0,0.3))',
  color: 'var(--ui-muted)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  justifyContent: 'flex-end',
}

const STAGE_QUICK_ACTION_CLASS = 'cursor-pointer transition-all duration-300 ease-out hover:max-w-[160px] hover:shadow-lg focus:outline-none'
const STAGE_QUICK_ACTION_LABEL_CLASS = 'whitespace-nowrap text-xs tracking-[0.2em] uppercase text-[var(--ui-text)] transition-all duration-300 ease-out max-w-[96px] overflow-hidden text-ellipsis opacity-10 group-hover:opacity-100 group-hover:max-w-[120px]'

export default function VnStagePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const runtime = useVnEngine()

  // ── Derived UI state ─────────────────────────────────────────────────
  const tFn = useCallback((key: string, fallback?: string) => t(key, fallback ?? '') as string, [t])
  const ui = useVnStageUI(runtime, tFn)

  // ── UI state from store ─────────────────────────────────────────────
  const {
    showBacklog, setShowBacklog,
    showSystemMenu, setShowSystemMenu,
    showCommandModal, setShowCommandModal,
    showSaveLoad, setShowSaveLoad,
    showExitConfirm, setShowExitConfirm,
    inputTab, setInputTab,
    selectedActionId, setSelectedActionId,
    talkText, setTalkText,
    saveLoadTab, setSaveLoadTab,
    saveModalError, setSaveModalError,
    isSavingSlot, setIsSavingSlot,
    loadingSlotId, setLoadingSlotId,
    deletingSlotId, setDeletingSlotId,
    endingSaved, setEndingSaved,
    isExitingAfterSave, setIsExitingAfterSave,
    thinkingVisible, setThinkingVisible,
    thinkingText, setThinkingText,
    thinkingTypewriter, setThinkingTypewriter,
  } = useVnStageStore()

  // ── Local state ──────────────────────────────────────────────────────
  const [isStarted, setIsStarted] = useState(false)
  const thinkingTimerRef = useRef<number | null>(null)

  // ── Route params ──────────────────────────────────────────────────────
  const routeMode = searchParams.get('mode') ?? ''
  const routeSessionId = searchParams.get('sessionId') ?? ''
  const routeSlotId = searchParams.get('slotId') ?? ''
  const isReplayRoute = searchParams.get('replay') === '1'
  const isReplay = runtime.mode === 'replay'

  // ── Computed ──────────────────────────────────────────────────────────
  const showNextHint = ui.phase === 'playing' && !!ui.currentFrame

  const isOverlayOpen = showBacklog || showSystemMenu || showSaveLoad || showExitConfirm
  const isStageBlocked = isOverlayOpen || showCommandModal || runtime.isHydrating || !!loadingSlotId

  const actionWhitelist = useMemo(() => {
    const scene = ui.currentScene
    const chips: Record<string, string>[] = (scene?.suggestionChips as Record<string, string>[]) ?? []
    return chips.map((c) => ({
      id: c['id'] ?? c['chipId'] ?? c['label'] ?? '',
      label: c['label'] ?? c['text'] ?? c['id'] ?? '',
    }))
  }, [ui.currentScene])

  const thinkingActive = ui.phase === 'busy' && thinkingVisible && !ui.currentFrame

  const dialogueText = useMemo(() => {
    if (ui.currentFrame?.text) return ui.currentFrame.text
    if (thinkingActive) return thinkingText
    return ''
  }, [ui.currentFrame, thinkingActive, thinkingText])

  const dialogueSpeaker = useMemo(() => {
    if (ui.currentFrame?.text) return ui.displaySpeaker
    if (thinkingActive) {
      const targetId = runtime.targetCharId
      if (targetId) {
        const charName = runtime.charactersById[targetId]?.displayName
        if (charName) return charName
      }
      return ui.displaySpeaker || ''
    }
    return ui.displaySpeaker
  }, [ui.currentFrame, ui.displaySpeaker, thinkingActive, runtime.targetCharId, runtime.charactersById])

  const dialogueTypewriter = useMemo(() => {
    if (ui.currentFrame?.text) return true
    if (thinkingActive) return thinkingTypewriter
    return true
  }, [ui.currentFrame, thinkingActive, thinkingTypewriter])

  // ── Thinking bubble helpers ───────────────────────────────────────────
  const clearThinkingTimer = useCallback(() => {
    if (thinkingTimerRef.current !== null) {
      window.clearTimeout(thinkingTimerRef.current)
      thinkingTimerRef.current = null
    }
  }, [])

  const resetThinkingState = useCallback(() => {
    clearThinkingTimer()
    setThinkingVisible(false)
    setThinkingText('')
  }, [clearThinkingTimer, setThinkingVisible, setThinkingText])

  const scheduleThinkingPhrase = useCallback(() => {
    resetThinkingState()
    if (isReplay) return
    setThinkingTypewriter(true)
    setThinkingText(t('message.vn_stage_thinking', '...'))
    thinkingTimerRef.current = window.setTimeout(() => {
      setThinkingVisible(true)
    }, 300)
  }, [resetThinkingState, isReplay, t, setThinkingTypewriter, setThinkingText, setThinkingVisible])

  // ── Char target selection ─────────────────────────────────────────────
  const ensureTargetCharSelected = useCallback(() => {
    if (!ui.talkTargets.length) {
      if (runtime.targetCharId) runtime.selectChar(null)
      return
    }
    if (!runtime.targetCharId || !ui.talkTargets.includes(runtime.targetCharId)) {
      runtime.selectChar(ui.talkTargets[0] ?? null)
    }
  }, [ui.talkTargets, runtime])

  // ── Game actions ──────────────────────────────────────────────────────
  const handleStageClick = useCallback(() => {
    if (isStageBlocked) return
    if (!isReplay && ui.phase !== 'playing') return
    const result = runtime.next()
    if (result.status !== 'ok' && result.code === 'STORY_ENDED') {
      console.info('[VnStage] Story ended')
    }
  }, [isStageBlocked, isReplay, ui.phase, runtime])

  const handleDialogueBoxClick = useCallback(() => {
    if (runtime.isHydrating || loadingSlotId) return
    if (ui.phase === 'await_input' && !showCommandModal) {
      setShowCommandModal(true)
    }
  }, [runtime.isHydrating, loadingSlotId, ui.phase, showCommandModal, setShowCommandModal])

  const handleSelectCharacter = useCallback((id: string | null) => {
    if (id && ui.dialogueCastIds.includes(id)) {
      runtime.selectChar(id)
    }
  }, [ui.dialogueCastIds, runtime])

  const handleChoose = useCallback((optionId: string) => {
    if (isReplay) return
    const choiceId = runtime.choiceView?.choiceId
    if (choiceId) {
      runtime.choose(choiceId, optionId)
    }
  }, [isReplay, runtime])

  const handleReturnToMenu = useCallback(() => {
    runtime.reset()
    navigate('/')
  }, [runtime, navigate])

  const handleEndingSave = useCallback(async () => {
    if (endingSaved) return
    setEndingSaved(true)
    try {
      const endingTitle = ui.currentEndingInfo?.title || runtime.endingId || 'Ending'
      const timestamp = new Date().toLocaleString('zh-TW', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
      await runtime.saveSlot(`${endingTitle} - ${timestamp}`)
    } catch {
      setEndingSaved(false)
    }
  }, [endingSaved, ui.currentEndingInfo, runtime, setEndingSaved])

  const handleSubmitCommand = useCallback(() => {
    if (isReplay) return
    if (inputTab === 'action' && selectedActionId) {
      runtime.submitAction(selectedActionId)
    } else if (inputTab === 'talk' && talkText.trim()) {
      runtime.submitTalk(talkText.trim())
    }
    setShowCommandModal(false)
    setTalkText('')
    setSelectedActionId(null)
  }, [isReplay, inputTab, selectedActionId, talkText, runtime, setShowCommandModal, setTalkText, setSelectedActionId])

  // ── Save/Load ─────────────────────────────────────────────────────────
  const openSaveLoad = useCallback((tab: 'save' | 'load' = 'save') => {
    setShowBacklog(false)
    setShowSystemMenu(false)
    setSaveLoadTab(tab)
    setSaveModalError(null)
    setShowSaveLoad(true)
    runtime.refreshSaveSlots()
  }, [runtime, setShowBacklog, setShowSystemMenu, setSaveLoadTab, setSaveModalError, setShowSaveLoad])

  const closeSaveLoad = useCallback(() => {
    setShowSaveLoad(false)
    if (isExitingAfterSave) {
      setIsExitingAfterSave(false)
      runtime.reset()
      navigate('/')
    }
  }, [isExitingAfterSave, runtime, navigate, setShowSaveLoad, setIsExitingAfterSave])

  const handleSaveSlot = useCallback(async () => {
    setIsSavingSlot(true)
    setSaveModalError(null)
    try {
      await runtime.saveSlot()
      runtime.refreshSaveSlots()
      if (isExitingAfterSave) closeSaveLoad()
    } catch (err: unknown) {
      setSaveModalError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSavingSlot(false)
    }
  }, [runtime, isExitingAfterSave, closeSaveLoad, setIsSavingSlot, setSaveModalError])

  const handleLoadSlot = useCallback(async (slotId: string) => {
    setLoadingSlotId(slotId)
    try {
      await runtime.loadSlot(slotId)
    } catch (err: unknown) {
      setSaveModalError(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoadingSlotId(null)
      setShowSaveLoad(false)
    }
  }, [runtime, setLoadingSlotId, setSaveModalError, setShowSaveLoad])

  const handleDeleteSlot = useCallback(async (slotId: string) => {
    setDeletingSlotId(slotId)
    try {
      await runtime.deleteSlot(slotId)
      runtime.refreshSaveSlots()
    } finally {
      setDeletingSlotId(null)
    }
  }, [runtime, setDeletingSlotId])

  const handleRenameSlot = useCallback(async (slotId: string, newTitle: string) => {
    try {
      await runtime.renameSlot(slotId, newTitle)
      runtime.refreshSaveSlots()
    } catch (err: unknown) {
      setSaveModalError(err instanceof Error ? err.message : 'Rename failed')
    }
  }, [runtime, setSaveModalError])

  const handleReplaySlot = useCallback(async (slotId: string) => {
    navigate(`/vn-replay?slotId=${slotId}&replay=1`)
  }, [navigate])

  // ── Menu ──────────────────────────────────────────────────────────────
  const handleMenuSelect = useCallback((action: string) => {
    switch (action) {
      case 'save': openSaveLoad('save'); break
      case 'load': openSaveLoad('load'); break
      case 'backlog':
        setShowSystemMenu(false)
        setShowBacklog(true)
        break
      case 'title':
        runtime.reset()
        navigate('/')
        break
    }
  }, [openSaveLoad, runtime, navigate, setShowBacklog, setShowSystemMenu])

  const handleConfirmExitSave = useCallback(() => {
    setShowExitConfirm(false)
    openSaveLoad('save')
    setIsExitingAfterSave(true)
  }, [openSaveLoad, setShowExitConfirm, setIsExitingAfterSave])

  const handleConfirmExitNoSave = useCallback(() => {
    setShowExitConfirm(false)
    runtime.reset()
    navigate('/')
  }, [runtime, navigate, setShowExitConfirm])

  // ── Session init ──────────────────────────────────────────────────────
  const handleStartRef = useRef(false)
  useEffect(() => {
    if (handleStartRef.current) return
    handleStartRef.current = true

    async function handleStart() {
      try {
        setShowBacklog(false)
        setShowCommandModal(false)
        setShowSaveLoad(false)
        setSaveModalError(null)

        // Load pack from registry
        const registry = usePackRegistryStore.getState()
        await registry.init()
        const storyKey = searchParams.get('storyKey')
        let packPayload: unknown = null
        if (storyKey) {
          const pack = await registry.getByStoryKey(storyKey)
          packPayload = pack?.payload ?? null
        }
        if (!packPayload) {
          const packs = registry.listPacks()
          packPayload = packs.length > 0 ? packs[0].payload : null
        }

        if (isReplayRoute) {
          if (routeSlotId) {
            await runtime.startReplayFromSlot(packPayload, routeSlotId)
          } else if (routeSessionId) {
            await runtime.startReplayFromSession(packPayload, routeSessionId)
          }
          setIsStarted(true)
          return
        }

        if (routeMode === 'new') {
          runtime.reset()
          await runtime.startSessionFromPack(packPayload)
          setIsStarted(true)
          return
        }

        if (routeSlotId) {
          await runtime.loadSlot(routeSlotId)
          setIsStarted(true)
          return
        }

        const restored = await runtime.restoreSessionFromPack(packPayload, routeSessionId || undefined)
        if (!restored) {
          await runtime.startSessionFromPack(packPayload)
        }
        setIsStarted(true)
      } catch (err) {
        console.error('[VnStage] handleStart failed:', err)
      }
    }

    handleStart()
  }, [runtime, isReplayRoute, routeSlotId, routeSessionId, routeMode, searchParams, setShowBacklog, setShowCommandModal, setShowSaveLoad, setSaveModalError])

  // ── Phase watchers ────────────────────────────────────────────────────
  const prevPhaseRef = useRef(ui.phase)
  useEffect(() => {
    if (ui.phase === 'busy') {
      scheduleThinkingPhrase()
    } else {
      resetThinkingState()
    }

    // Auto-open command modal when entering await_input
    if (
      isStarted &&
      !isReplay &&
      !runtime.isHydrating &&
      ui.phase === 'await_input' &&
      prevPhaseRef.current !== 'await_input'
    ) {
      if (!ui.hasDialogueTargets) setInputTab('action')
      ensureTargetCharSelected()
      setShowCommandModal(true)
    }

    prevPhaseRef.current = ui.phase
  }, [ui.phase, isStarted, isReplay, runtime.isHydrating, ui.hasDialogueTargets, scheduleThinkingPhrase, resetThinkingState, ensureTargetCharSelected, setInputTab, setShowCommandModal])

  // Reset thinking when frame arrives
  useEffect(() => {
    if (ui.currentFrame?.text) resetThinkingState()
  }, [ui.currentFrame, resetThinkingState])

  // Ensure target char selected when cast changes
  useEffect(() => {
    ensureTargetCharSelected()
  }, [ui.dialogueCastIds, ensureTargetCharSelected])

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      // 1. Escape to close overlays
      if (e.key === 'Escape') {
        if (showBacklog) { setShowBacklog(false); return }
        if (showSystemMenu) { setShowSystemMenu(false); return }
        if (showSaveLoad) { closeSaveLoad(); return }
        if (ui.phase === 'await_choice') { setShowSystemMenu(true); return }
        if (ui.phase === 'await_input') { setShowCommandModal(false); return }
      }

      if (isStageBlocked) return

      // Skip input/textarea
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return
      }

      // Choice mode - block next
      if (ui.phase === 'await_choice') {
        if (e.key === ' ' || e.key === 'Enter') e.preventDefault()
        return
      }

      // Await input - open command
      if (ui.phase === 'await_input') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          if (!showCommandModal) setShowCommandModal(true)
          return
        }
        if (e.key === 'Tab') {
          e.preventDefault()
          setInputTab(inputTab === 'talk' ? 'action' : 'talk')
          return
        }
      }

      // Playing mode
      if (ui.phase === 'playing') {
        if (e.key.toLowerCase() === 'h') {
          e.preventDefault()
          setShowBacklog(!showBacklog)
          return
        }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          if (!isReplay) runtime.next()
        }
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [showBacklog, showSystemMenu, showSaveLoad, showCommandModal, ui.phase, isStageBlocked, isReplay, runtime, closeSaveLoad, inputTab, setShowBacklog, setShowSystemMenu, setShowCommandModal, setInputTab])

  // Cleanup on unmount
  useEffect(() => {
    return () => clearThinkingTimer()
  }, [clearThinkingTimer])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <main
      className="relative flex h-screen w-screen flex-col"
      style={{ background: 'var(--ui-vn-stage-bg)', color: 'var(--ui-vn-stage-text)' }}
      data-testid="vn-stage-page"
    >
      <StageViewport
        frame={ui.stageFrame}
        selectedCharacterId={runtime.targetCharId}
        onSelectCharacter={handleSelectCharacter}
        onClick={handleStageClick}
        frameOverlay={
          <>
            {/* Character Select */}
            {ui.phase === 'await_input' && ui.dialogueCastIds.length > 1 && (
              <div
                className="absolute right-4 top-16 z-30"
                onClick={(e) => e.stopPropagation()}
              >
                <CharSelect
                  value={runtime.targetCharId}
                  activeCastIds={ui.dialogueCastIds}
                  charactersById={runtime.charactersById}
                  assetsBaseUrl={runtime.assetsBaseUrl}
                  highlightedId={ui.speakerHighlightId}
                  onChange={handleSelectCharacter}
                />
              </div>
            )}

            {/* Quick Actions */}
            <div
              className="absolute right-4 top-4 z-20 flex items-end justify-end gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={`${STAGE_QUICK_ACTION_CLASS} group`}
                style={STAGE_QUICK_ACTION_STYLE}
                onClick={() => setShowSystemMenu(true)}
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className={STAGE_QUICK_ACTION_LABEL_CLASS}>
                  {t('message.vn_stage_menu_short', '菜單')}
                </span>
              </button>
              <button
                type="button"
                className={`${STAGE_QUICK_ACTION_CLASS} group`}
                style={STAGE_QUICK_ACTION_STYLE}
                onClick={() => setShowBacklog(true)}
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <span className={STAGE_QUICK_ACTION_LABEL_CLASS}>
                  {t('message.vn_stage_history', '歷史')}
                </span>
              </button>
            </div>

            {/* Replay Badge */}
            {isReplay && (
              <div
                className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded px-3 py-2 text-sm font-semibold"
                style={{
                  background: 'rgba(0,0,0,0.7)',
                  color: 'var(--ui-text)',
                }}
                data-testid="badge-replay-readonly"
              >
                <svg className="mr-1 h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span>Replay Mode (Read-only)</span>
              </div>
            )}

            {/* Dialogue Box */}
            {(ui.currentFrame || ui.phase !== 'playing') && (
              <DialogueBox
                speaker={dialogueSpeaker}
                text={dialogueText}
                typewriter={dialogueTypewriter}
                showNextHint={showNextHint}
                onClick={handleDialogueBoxClick}
                promptSlot={
                  ui.phase !== 'playing' && !isReplay ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all
                        hover:scale-105 hover:shadow-lg active:scale-95
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ui-imperial-gold)]"
                      style={{
                        border: '1px solid var(--ui-imperial-gold-soft, rgba(255,215,0,0.3))',
                        background: 'color-mix(in srgb, var(--ui-panel) 70%, transparent)',
                        color: 'var(--ui-text)',
                      }}
                      data-testid="btn-open-command"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowCommandModal(true)
                      }}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="6" />
                      </svg>
                      <span>{t('message.vn_stage_await_input', 'Your Turn')}</span>
                    </button>
                  ) : undefined
                }
              />
            )}

            {/* FAB Menu Button */}
            {!showSystemMenu && (
              <button
                type="button"
                className="absolute right-4 bottom-4 z-[501] flex h-12 w-12 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
                style={{
                  background: 'var(--ui-gradient-primary)',
                  boxShadow: 'var(--ui-shadow-strong)',
                }}
                aria-label={t('message.vn_stage_menu', 'Menu')}
                data-testid="fab-menu-button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSystemMenu(true)
                }}
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="var(--ui-inverse)" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
          </>
        }
      >
        {/* System Menu */}
        <SystemMenu
          open={showSystemMenu}
          onClose={() => setShowSystemMenu(false)}
          onSelect={handleMenuSelect}
        />

        {/* Command Composer Modal */}
        {showCommandModal && (
          <div
            className="absolute inset-0 z-40 flex items-end justify-center pb-32"
            onClick={(e) => {
              e.stopPropagation()
              setShowCommandModal(false)
            }}
          >
            <div
              className="w-full max-w-lg rounded-xl p-4"
              style={{
                background: 'color-mix(in srgb, var(--ui-bg) 90%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ui-text) 10%, transparent)',
                backdropFilter: 'blur(16px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <CommandComposer
                disabled={isReplay}
                activeTab={inputTab}
                actionWhitelist={actionWhitelist}
                selectedActionId={selectedActionId}
                talkText={talkText}
                disabledTalk={!ui.hasDialogueTargets}
                talkDisabledHint={ui.talkDisabledHint}
                onSwitchTab={setInputTab}
                onSelectAction={setSelectedActionId}
                onUpdateTalk={setTalkText}
                onSubmit={handleSubmitCommand}
                onCancel={() => setShowCommandModal(false)}
              />
            </div>
          </div>
        )}

        {/* Overlay Blocker */}
        {isOverlayOpen && (
          <div
            className="absolute inset-0 z-30"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* Choice Overlay */}
        {ui.phase === 'await_choice' && (
          <ChoiceOverlay
            view={runtime.choiceView}
            disabled={isReplay}
            onChoose={handleChoose}
          />
        )}

        {/* Ending Panel */}
        {ui.showEndingPanel && (
          <EndingPanel
            info={ui.currentEndingInfo}
            isReplay={isReplay}
            endingSaved={endingSaved}
            onReturn={handleReturnToMenu}
            onSave={handleEndingSave}
          />
        )}
      </StageViewport>

      {/* Backlog */}
      <BacklogPanel
        open={showBacklog}
        items={runtime.backlogItems}
        onClose={() => setShowBacklog(false)}
      />

      {/* Save/Load Drawer */}
      {showSaveLoad && (
        <QuickSaveLoadDrawer
          open={showSaveLoad}
          activeTab={saveLoadTab}
          slots={runtime.saveSlots}
          busy={isSavingSlot || !!loadingSlotId || !!deletingSlotId}
          error={saveModalError}
          onClose={closeSaveLoad}
          onSave={handleSaveSlot}
          onLoad={handleLoadSlot}
          onDelete={handleDeleteSlot}
          onRename={handleRenameSlot}
          onReplay={handleReplaySlot}
          onUpdateActiveTab={setSaveLoadTab}
        />
      )}

      {/* Exit Dialog */}
      <ExitDialog
        open={showExitConfirm}
        isDirty={runtime.isDirty}
        onClose={() => setShowExitConfirm(false)}
        onExitNoSave={handleConfirmExitNoSave}
        onExitSave={handleConfirmExitSave}
      />
    </main>
  )
}
