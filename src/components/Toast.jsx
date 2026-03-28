import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const VARIANTS = {
  error: 'border-red-900/60 bg-surface-raised text-red-300',
  success: 'border-accent/40 bg-surface-raised text-accent',
  info: 'border-surface-border bg-surface-raised text-text-secondary',
}

export function useToast() {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, variant = 'info') => {
    setToast({ message, variant, id: Date.now() })
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  return { toast, show, dismiss }
}

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`flex items-center gap-3 px-5 py-3 rounded-full border backdrop-blur-sm ${VARIANTS[toast.variant] || VARIANTS.info}`}
          >
            <span className="text-sm font-body whitespace-nowrap">
              {toast.message}
            </span>
            <button
              onClick={onDismiss}
              className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

Toast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.number,
    message: PropTypes.string,
    variant: PropTypes.string,
  }),
  onDismiss: PropTypes.func.isRequired,
}
