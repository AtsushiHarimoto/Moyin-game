import { useMemo, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle } from 'lucide-react'
import { useStoryWorkshopStore } from '../stores/useStoryWorkshopStore'

const TAB_INDENT = '  '

const EDITOR_FONT_STYLE = {
  fontFamily: 'var(--ui-font-mono)',
  fontSize: '13px',
  lineHeight: '20px',
} as const

/**
 * 用途：將位元組數轉為人類可讀的檔案大小字串
 *
 * @param bytes 位元組數，非負整數
 * @returns 格式化的大小字串 (e.g. "512 B" or "1.5 KB")
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export function WorkshopJsonEditor() {
  const { t } = useTranslation()
  const editorDraft = useStoryWorkshopStore((s) => s.editorDraft)
  const parseError = useStoryWorkshopStore((s) => s.parseError)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const lineCount = useMemo(() => {
    if (!editorDraft) return 0
    return editorDraft.split('\n').length
  }, [editorDraft])

  const byteSize = useMemo(() => {
    return new Blob([editorDraft]).size
  }, [editorDraft])

  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1),
    [lineCount],
  )

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    useStoryWorkshopStore.getState().updateDraft(e.target.value)
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Tab') return

      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const { selectionStart, selectionEnd, value } = textarea
      const newValue =
        value.substring(0, selectionStart) + TAB_INDENT + value.substring(selectionEnd)
      useStoryWorkshopStore.getState().updateDraft(newValue)

      // 恢復游標位置（在下一幀，因為 React 會重新渲染 textarea）
      const newCursorPos = selectionStart + TAB_INDENT.length
      requestAnimationFrame(() => {
        textarea.selectionStart = newCursorPos
        textarea.selectionEnd = newCursorPos
      })
    },
    [],
  )

  return (
    <div
      className="flex min-w-0 flex-1 flex-col"
      style={{ background: 'var(--workshop-editor-bg)' }}
      data-testid="workshop-editor"
    >
      {parseError && (
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{
            background: 'color-mix(in srgb, var(--ui-danger) 10%, transparent)',
            borderBottom: '1px solid color-mix(in srgb, var(--ui-danger) 20%, transparent)',
          }}
        >
          <AlertCircle size={14} style={{ color: 'var(--ui-danger)' }} />
          <span className="text-xs" style={{ color: 'var(--ui-danger)' }}>
            {parseError}
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div
          className="select-none overflow-hidden px-3 py-3 text-right"
          style={{
            ...EDITOR_FONT_STYLE,
            color: 'var(--ui-muted)',
            borderRight: '1px solid var(--ui-border)',
            minWidth: '48px',
            opacity: 0.6,
          }}
          aria-hidden="true"
        >
          {lineNumbers.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          className="flex-1 resize-none border-none bg-transparent p-3 outline-none"
          style={{
            ...EDITOR_FONT_STYLE,
            color: 'var(--workshop-editor-text)',
            caretColor: 'var(--ui-primary)',
          }}
          value={editorDraft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          data-testid="workshop-editor-textarea"
          placeholder={t('message.workshop_placeholder', 'Paste or type JSON here...')}
        />
      </div>

      <div
        className="flex items-center justify-between px-4 py-1"
        style={{
          borderTop: '1px solid var(--ui-border)',
          background: 'var(--ui-panel-subtle)',
        }}
      >
        <span
          className="text-xs"
          style={{ color: 'var(--ui-muted)', fontFamily: 'var(--ui-font-mono)' }}
        >
          {t('message.workshop_lines', 'Lines')}: {lineCount}
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--ui-muted)', fontFamily: 'var(--ui-font-mono)' }}
        >
          {formatBytes(byteSize)}
        </span>
      </div>
    </div>
  )
}
