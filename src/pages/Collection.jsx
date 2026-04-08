import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Share2, Check, Download, Trash2 } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import LoadingScreen from '../components/LoadingScreen'
import FileTypeIcon from '../components/FileTypeIcon'
import Lightbox from '../components/Lightbox'
import useInlineEdit from '../hooks/useInlineEdit'
import { downloadFile } from '../utils/download'
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

  const [renameError, setRenameError] = useState(null)
  const renameErrorTimerRef = useRef(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const showRenameError = useCallback((fileId) => {
    setRenameError(fileId)
    clearTimeout(renameErrorTimerRef.current)
    renameErrorTimerRef.current = setTimeout(() => setRenameError(null), 3000)
  }, [])

  const fileEdit = useInlineEdit({
    onSave: async (fileId, name) => {
      await axios.patch(`/api/file/${fileId}/rename`, { name })
      setData((prev) => ({
        ...prev,
        files: prev.files.map((f) =>
          f.id === fileId ? { ...f, name } : f,
        ),
      }))
    },
    onError: showRenameError,
  })

  const titleEdit = useInlineEdit({
    onSave: async (_id, title) => {
      await axios.patch(`/api/collection/${id}/rename`, { title })
      setData((prev) => ({ ...prev, title }))
    },
    onError: showRenameError,
  })

  useEffect(
    () => () => {
      clearTimeout(copiedTimerRef.current)
      clearTimeout(renameErrorTimerRef.current)
    },
    [],
  )

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

  const handleDownload = (e, file) => {
    e.preventDefault()
    e.stopPropagation()
    downloadFile(file.downloadUrl, file.name)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await axios.delete(`/api/file/${deleteTarget.id}`)
      setData((prev) => ({
        ...prev,
        files: prev.files.filter((f) => f.id !== deleteTarget.id),
      }))
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete failed:', err)
      setDeleteError('Failed to delete. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const renderFileName = (file, truncateClass = 'truncate') => {
    if (data.isOwner && fileEdit.editingId === file.id) {
      return (
        <input
          type="text"
          value={fileEdit.value}
          onChange={(e) => fileEdit.setValue(e.target.value)}
          onKeyDown={(e) => fileEdit.handleKeyDown(e, file.id)}
          onBlur={() => fileEdit.handleBlur(file.id)}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          className="text-sm text-text-primary font-body bg-transparent border-b border-accent outline-none w-full"
          onClick={(e) => e.stopPropagation()}
        />
      )
    }
    return (
      <>
        <p
          className={`text-sm text-text-primary ${truncateClass} font-body border-b border-transparent ${data.isOwner ? 'cursor-text' : ''}`}
          title={file.name}
          onDoubleClick={
            data.isOwner
              ? (e) => {
                  e.stopPropagation()
                  fileEdit.start(file.id, file.name)
                }
              : undefined
          }
        >
          {file.name}
        </p>
        {renameError === file.id && (
          <p className="text-xs text-red-400 font-body">Rename failed</p>
        )}
      </>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-surface text-text-primary p-4 md:p-12">
        <header className="max-w-5xl mx-auto mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              aria-label="Go back to dashboard"
              className="p-2.5 rounded-full bg-surface-raised border border-surface-border hover:border-accent transition-colors duration-300"
            >
              <ArrowLeft
                className="w-4 h-4 text-text-secondary"
                aria-hidden="true"
              />
            </Link>
            <div>
              {data.isOwner && titleEdit.editingId === 'title' ? (
                <input
                  type="text"
                  value={titleEdit.value}
                  onChange={(e) => titleEdit.setValue(e.target.value)}
                  onKeyDown={(e) => titleEdit.handleKeyDown(e, 'title')}
                  onBlur={() => titleEdit.handleBlur('title')}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className="font-display text-display-md text-text-primary break-all bg-transparent border-b border-accent outline-none w-full"
                />
              ) : (
                <h1
                  className={`font-display text-display-md text-text-primary break-all border-b border-transparent ${data.isOwner ? 'cursor-text' : ''}`}
                  onDoubleClick={
                    data.isOwner
                      ? () => titleEdit.start('title', data.title)
                      : undefined
                  }
                >
                  {title}
                </h1>
              )}
              {renameError === 'title' && (
                <p className="text-xs text-red-400 font-body">Rename failed</p>
              )}
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
                key={file.id}
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
                      {renderFileName(file, 'truncate')}
                      <p className="text-xs text-text-muted">
                        {formatSize(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDownload(e, file)}
                        className="p-2 rounded-full bg-white/10 text-text-secondary hover:text-accent transition-colors"
                        aria-label={`Download ${file.name}`}
                      >
                        <Download
                          className="w-3.5 h-3.5"
                          aria-hidden="true"
                        />
                      </button>
                      {data.isOwner && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(file)
                          }}
                          className="p-2 rounded-full bg-white/10 text-text-secondary hover:text-red-400 transition-colors"
                          aria-label={`Delete ${file.name}`}
                        >
                          <Trash2
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </div>
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
                key={file.id}
                variants={fadeUp}
                className="group flex items-center gap-4 p-4 bg-surface-raised rounded-xl hover:bg-surface-overlay transition-colors duration-300"
              >
                <FileTypeIcon type={file.type} className="w-8 h-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  {renderFileName(file, 'truncate')}
                  <p className="text-xs text-text-muted">
                    {formatSize(file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => handleDownload(e, file)}
                    className="p-2 text-text-muted hover:text-accent transition-colors duration-300"
                    aria-label={`Download ${file.name}`}
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </button>
                  {data.isOwner && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(file)}
                      className="p-2 text-text-muted hover:text-red-400 transition-colors duration-300"
                      aria-label={`Delete ${file.name}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
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

        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              onClick={closeDeleteModal}
              onKeyDown={(e) => e.key === 'Escape' && closeDeleteModal()}
              role="dialog"
              aria-modal="true"
              aria-label={`Delete ${deleteTarget.name}`}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 bg-surface-raised border border-surface-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="font-display text-display-sm text-text-primary mb-2">
                  Delete {deleteTarget.name}?
                </h2>
                <p className="text-sm text-text-muted font-body mb-6">
                  This action cannot be undone. The file will be permanently
                  removed.
                </p>
                {deleteError && (
                  <p className="text-sm text-red-400 font-body mb-4">
                    {deleteError}
                  </p>
                )}
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="px-4 py-2 rounded-lg text-sm font-body text-text-secondary hover:text-text-primary transition-colors duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg text-sm font-body bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors duration-300 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
