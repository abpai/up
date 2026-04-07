import React, { useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'

export default function Lightbox({ images, index, onClose, onNavigate }) {
  const current = images[index]
  const hasPrev = index > 0
  const hasNext = index < images.length - 1

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(index + 1)
    },
    [onClose, onNavigate, index, hasPrev, hasNext],
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

        {hasPrev && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(index - 1)
            }}
            className="absolute left-4 md:left-8 z-10 p-3 rounded-full bg-surface-raised/60 border border-surface-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {hasNext && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(index + 1)
            }}
            className="absolute right-4 md:right-8 z-10 p-3 rounded-full bg-surface-raised/60 border border-surface-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-8 md:right-8 z-10 p-3 rounded-full bg-surface-raised/60 border border-surface-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
          aria-label="Close lightbox"
        >
          <X className="w-5 h-5" />
        </button>

        <motion.img
          key={current.url}
          src={current.url}
          alt={current.name}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-h-[80vh] max-w-[90vw] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="relative z-10 mt-4 flex items-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-text-secondary font-body">
            {current.name}
          </span>
          <a
            href={current.downloadUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors"
            aria-label={`Download ${current.name}`}
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </a>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

Lightbox.propTypes = {
  images: PropTypes.arrayOf(
    PropTypes.shape({
      url: PropTypes.string.isRequired,
      downloadUrl: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ).isRequired,
  index: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
}
