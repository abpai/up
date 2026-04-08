import { useState, useRef, useCallback } from 'react'

export default function useInlineEdit({ onSave, onError }) {
  const [editingId, setEditingId] = useState(null)
  const [value, setValue] = useState('')
  const originalRef = useRef('')
  const escapePressedRef = useRef(false)

  const start = useCallback((id, currentValue) => {
    originalRef.current = currentValue
    escapePressedRef.current = false
    setEditingId(id)
    setValue(currentValue)
  }, [])

  const cancel = useCallback(() => {
    setEditingId(null)
    setValue('')
  }, [])

  const save = useCallback(
    async (id) => {
      const trimmed = value.trim()
      if (!trimmed || trimmed === originalRef.current) {
        cancel()
        return
      }
      try {
        await onSave(id, trimmed)
        cancel()
      } catch (err) {
        console.error('Save failed:', err)
        cancel()
        onError?.(id)
      }
    },
    [value, onSave, onError, cancel],
  )

  const handleKeyDown = useCallback(
    (e, id) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        save(id)
      } else if (e.key === 'Escape') {
        escapePressedRef.current = true
        cancel()
      }
    },
    [save, cancel],
  )

  const handleBlur = useCallback(
    (id) => {
      if (escapePressedRef.current) {
        escapePressedRef.current = false
        return
      }
      save(id)
    },
    [save],
  )

  return {
    editingId,
    value,
    setValue,
    start,
    cancel,
    handleKeyDown,
    handleBlur,
  }
}
