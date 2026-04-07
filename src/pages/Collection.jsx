import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Share2, Check, Download } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import LoadingScreen from '../components/LoadingScreen'
import FileTypeIcon from '../components/FileTypeIcon'
import Lightbox from '../components/Lightbox'
import { stagger, fadeUp } from '../utils/motion'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function Collection() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const copiedTimerRef = useRef(null)

  useEffect(() => () => clearTimeout(copiedTimerRef.current), [])

  useEffect(() => {
    axios
      .get(`/api/collection/${id}`)
      .then((res) => {
        setData(res.data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setError('Collection not found.')
        setLoading(false)
      })
  }, [id])

  const imageFiles = useMemo(
    () => (data?.files || []).filter((f) => f.type.startsWith('image/')),
    [data],
  )

  const otherFiles = useMemo(
    () => (data?.files || []).filter((f) => !f.type.startsWith('image/')),
    [data],
  )

  if (loading) return <LoadingScreen />

  if (error)
    return (
      <PageTransition>
        <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
          <p className="font-display text-display-md text-text-secondary">
            {error}
          </p>
          <Link
            to="/"
            className="text-sm text-text-muted hover:text-accent transition-colors duration-300"
          >
            Go home
          </Link>
        </div>
      </PageTransition>
    )

  const { files, title, createdAt } = data

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-surface text-text-primary p-4 md:p-12">
        <header className="max-w-5xl mx-auto mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              aria-label="Go back to home"
              className="p-2.5 rounded-full bg-surface-raised border border-surface-border hover:border-accent transition-colors duration-300"
            >
              <ArrowLeft
                className="w-4 h-4 text-text-secondary"
                aria-hidden="true"
              />
            </Link>
            <div>
              <h1 className="font-display text-display-md text-text-primary break-all">
                {title}
              </h1>
              <p className="text-sm text-text-muted font-body mt-1">
                Shared{' '}
                {formatDistanceToNow(new Date(createdAt), {
                  addSuffix: true,
                })}{' '}
                &ndash; {files.length} file{files.length !== 1 && 's'}
              </p>
            </div>
          </div>
          <button
            onClick={copyLink}
            aria-label={copied ? 'Link copied' : 'Copy share link'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-body transition-all duration-300 active:scale-[0.97] ${
              copied
                ? 'border-accent text-accent'
                : 'border-surface-border text-text-secondary hover:border-accent hover:text-accent'
            }`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  Copied
                </motion.span>
              ) : (
                <motion.span
                  key="share"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Share
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </header>

        {imageFiles.length > 0 && (
          <motion.section
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
          >
            {imageFiles.map((file, idx) => (
              <motion.div
                key={file.url}
                variants={fadeUp}
                className="group relative bg-surface-raised rounded-xl overflow-hidden cursor-pointer transition-all duration-500 ease-luxury hover:shadow-xl hover:shadow-black/30 hover:scale-[1.02]"
                onClick={() => setLightboxIndex(idx)}
              >
                <img
                  src={file.url}
                  alt={file.name}
                  loading="lazy"
                  className="w-full h-auto max-h-80 object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-luxury">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-3">
                      <p className="text-sm text-text-primary truncate font-body">
                        {file.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <a
                      href={file.downloadUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-full bg-white/10 text-text-secondary hover:text-accent transition-colors"
                      aria-label={`Download ${file.name}`}
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.section>
        )}

        {otherFiles.length > 0 && (
          <motion.section
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-5xl mx-auto flex flex-col gap-2"
          >
            {otherFiles.map((file) => (
              <motion.div
                key={file.url}
                variants={fadeUp}
                className="group flex items-center gap-4 p-4 bg-surface-raised rounded-xl hover:bg-surface-overlay transition-colors duration-300"
              >
                <FileTypeIcon type={file.type} className="w-8 h-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm text-text-primary truncate font-body"
                    title={file.name}
                  >
                    {file.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatSize(file.size)}
                  </p>
                </div>
                <a
                  href={file.downloadUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-text-muted hover:text-accent transition-colors duration-300"
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                </a>
              </motion.div>
            ))}
          </motion.section>
        )}

        {lightboxIndex !== null && (
          <Lightbox
            images={imageFiles}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </div>
    </PageTransition>
  )
}
