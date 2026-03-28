import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import axios from 'axios'
import PageTransition from '../components/PageTransition'
import UploadProgress from '../components/UploadProgress'
import Toast, { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function Home() {
  const [uploading, setUploading] = useState(false)
  const [fileCount, setFileCount] = useState(0)
  const { toast, show: showToast, dismiss: dismissToast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return

      if (!user) {
        navigate('/login?redirect=/')
        return
      }

      setUploading(true)
      setFileCount(acceptedFiles.length)

      const formData = new FormData()
      acceptedFiles.forEach((file) => {
        formData.append('file', file)
      })

      try {
        const res = await axios.post('/api/upload', formData)
        const { id } = res.data
        navigate(`/c/${id}`)
      } catch (e) {
        console.error('Upload failed:', e)
        const message =
          e.response?.data?.error || 'Upload failed. Please try again.'
        showToast(message, 'error')
        setUploading(false)
      }
    },
    [navigate, showToast, user],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: uploading,
  })

  useEffect(() => {
    const handlePaste = (e) => {
      if (uploading) return
      if (e.clipboardData.files.length > 0) {
        onDrop(Array.from(e.clipboardData.files))
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onDrop, uploading])

  return (
    <PageTransition>
      <div
        {...getRootProps()}
        role="button"
        tabIndex={0}
        aria-label="Upload files - drop files here or click to browse"
        aria-busy={uploading}
        className="min-h-screen bg-surface text-text-primary flex flex-col items-center justify-center p-4 outline-none transition-all duration-700 ease-luxury relative"
        style={
          isDragActive
            ? {
                boxShadow: 'inset 0 0 120px 40px rgba(196, 162, 101, 0.04)',
                background:
                  'radial-gradient(ellipse at center, rgba(196, 162, 101, 0.05) 0%, #0C0C0C 70%)',
              }
            : undefined
        }
      >
        <input {...getInputProps()} aria-label="File input" />

        {uploading ? (
          <UploadProgress fileCount={fileCount} />
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center justify-center"
          >
            <motion.h1
              variants={item}
              animate={isDragActive ? { y: -4 } : { y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-display-lg text-text-primary mb-4"
            >
              Up
            </motion.h1>

            <motion.p
              variants={item}
              className="text-lg text-text-secondary text-center max-w-md mb-12 font-body"
            >
              Drop anything.
            </motion.p>

            <motion.div
              variants={item}
              className="flex flex-col items-center gap-3"
            >
              <div className="px-6 py-3 rounded-full border border-surface-border text-text-muted text-sm font-body pointer-events-none transition-colors duration-500">
                {isDragActive ? 'Release to upload' : 'Click to browse'}
              </div>
              <span className="text-xs text-text-muted font-body">
                or press{' '}
                {navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl+'}V to
                paste
              </span>
            </motion.div>
          </motion.div>
        )}

        {!uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="absolute bottom-8 flex items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {user ? (
              <Link
                to="/dashboard"
                aria-label="View my uploads"
                className="text-sm text-text-muted hover:text-text-secondary transition-colors duration-300 font-body"
              >
                My uploads
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm text-text-muted hover:text-text-secondary transition-colors duration-300 font-body"
              >
                Sign in
              </Link>
            )}
          </motion.div>
        )}

        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </PageTransition>
  )
}
