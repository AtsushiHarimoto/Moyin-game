import { useCallback, useEffect, useMemo, useState } from 'react'
import ModalDialog from '@/components/ui/ModalDialog'
import Button from '@/components/ui/Button'
import GameIcon from '@/components/ui/GameIcon'
import type { SaveData } from '@/components/save/SaveSlotCard'

interface SaveEditDialogProps {
  open: boolean
  saveData?: SaveData | null
  isNewSave?: boolean
  onClose: () => void
  onLoad?: () => void
  onSave?: (title: string) => void
  onRename?: (title: string) => void
}

export default function SaveEditDialog({
  open,
  saveData = null,
  isNewSave = false,
  onClose,
  onLoad,
  onSave,
  onRename,
}: SaveEditDialogProps) {
  const [editedTitle, setEditedTitle] = useState('')
  const [originalTitle, setOriginalTitle] = useState('')

  const formattedTime = useMemo(() => {
    if (!saveData?.timestamp) return '-'
    const date = new Date(saveData.timestamp)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [saveData])

  // Sync title when saveData changes
  useEffect(() => {
    if (saveData) {
      setEditedTitle(saveData.title || '')
      setOriginalTitle(saveData.title || '')
    } else {
      setEditedTitle('')
      setOriginalTitle('')
    }
  }, [saveData])

  // Generate default name for new saves when dialog opens
  useEffect(() => {
    if (open && isNewSave) {
      const now = new Date()
      const defaultName = `存檔 ${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
      setEditedTitle(defaultName)
      setOriginalTitle('')
    }
  }, [open, isNewSave])

  const handleSave = useCallback(() => {
    if (editedTitle.trim()) {
      onSave?.(editedTitle.trim())
    }
  }, [editedTitle, onSave])

  const handleRename = useCallback(() => {
    if (editedTitle.trim()) {
      onRename?.(editedTitle.trim())
    }
  }, [editedTitle, onRename])

  const titleChanged = editedTitle !== originalTitle

  return (
    <ModalDialog
      open={open}
      title={isNewSave ? '新建存檔' : '存檔管理'}
      onClose={onClose}
    >
      <div className="min-w-[400px] p-6">
        {/* Title input */}
        <div className="mb-6">
          <label
            className="mb-2 block text-sm font-semibold"
            style={{ color: 'var(--ui-text)' }}
          >
            存檔名稱
          </label>
          <input
            type="text"
            className="w-full rounded-lg border-2 bg-transparent px-4 py-3 text-base transition-colors duration-200 focus:outline-none"
            style={{
              borderColor: 'var(--ui-border)',
              background: 'var(--ui-panel)',
              color: 'var(--ui-text)',
            }}
            placeholder="請輸入存檔名稱"
            maxLength={50}
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--ui-primary)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--ui-border)'
            }}
          />
        </div>

        {/* Save info (existing save only) */}
        {!isNewSave && saveData && (
          <div
            className="mb-6 rounded-lg p-4"
            style={{ background: 'var(--ui-panel-subtle)' }}
          >
            <div className="mb-2 flex items-center">
              <span className="min-w-[60px] text-sm font-semibold" style={{ color: 'var(--ui-muted)' }}>
                章節：
              </span>
              <span className="text-sm" style={{ color: 'var(--ui-text)' }}>
                {String(saveData.meta?.chapter ?? '-')}
              </span>
            </div>
            <div className="mb-2 flex items-center">
              <span className="min-w-[60px] text-sm font-semibold" style={{ color: 'var(--ui-muted)' }}>
                時間：
              </span>
              <span className="text-sm" style={{ color: 'var(--ui-text)' }}>
                {formattedTime}
              </span>
            </div>
            <div className="flex items-center">
              <span className="min-w-[60px] text-sm font-semibold" style={{ color: 'var(--ui-muted)' }}>
                故事：
              </span>
              <span className="text-sm" style={{ color: 'var(--ui-text)' }}>
                {saveData.subtitle || '-'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-3 border-t pt-6"
          style={{ borderColor: 'var(--ui-border)' }}
        >
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>

          {!isNewSave && (
            <Button variant="primary" onClick={onLoad}>
              <GameIcon name="play" size={16} />
              讀取存檔
            </Button>
          )}

          {isNewSave && (
            <Button
              variant="primary"
              disabled={!editedTitle.trim()}
              onClick={handleSave}
            >
              <GameIcon name="save" size={16} />
              確認存檔
            </Button>
          )}

          {!isNewSave && titleChanged && (
            <Button
              variant="primary"
              disabled={!editedTitle.trim()}
              onClick={handleRename}
            >
              重命名
            </Button>
          )}
        </div>
      </div>
    </ModalDialog>
  )
}
