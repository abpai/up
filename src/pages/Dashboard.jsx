import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, KeyRound, LogOut, Trash2 } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import LoadingScreen from '../components/LoadingScreen'
import FileTypeIcon from '../components/FileTypeIcon'
import Toast, { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { stagger, fadeUp } from '../utils/motion'

function formatTokenTiming(token) {
  const createdLabel = `Created ${formatDistanceToNow(
    new Date(token.createdAt),
  )} ago`

  if (!token.lastUsedAt) {
    return `${createdLabel} • never used`
  }

  return `${createdLabel} • last used ${formatDistanceToNow(
    new Date(token.lastUsedAt),
  )} ago`
}

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()
  const [collections, setCollections] = useState([])
  const [tokens, setTokens] = useState([])
  const [tokenName, setTokenName] = useState('')
  const [newToken, setNewToken] = useState(null)
  const [creatingToken, setCreatingToken] = useState(false)
  const [revokingTokenId, setRevokingTokenId] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast, show: showToast, dismiss: dismissToast } = useToast()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/dashboard', { replace: true })
    }
  }, [authLoading, user, navigate])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let active = true

    async function loadDashboard() {
      try {
        const [dashboardRes, tokensRes] = await Promise.all([
          axios.get('/api/dashboard'),
          axios.get('/api/auth/tokens'),
        ])

        if (!active) return
        setCollections(dashboardRes.data.collections)
        setTokens(tokensRes.data.tokens)
      } catch (error) {
        console.error(error)
        if (!active) return
        showToast(
          error.response?.data?.error || 'Failed to load dashboard.',
          'error',
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [user, showToast])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleCreateToken = async () => {
    setCreatingToken(true)
    try {
      const res = await axios.post('/api/auth/tokens', {
        name: tokenName.trim() || 'CLI token',
      })
      setTokens((current) => [res.data.token, ...current])
      setNewToken(res.data.plaintextToken)
      setTokenName('')
      showToast('API token created. Copy it now.', 'success')
    } catch (error) {
      showToast(
        error.response?.data?.error || 'Failed to create API token.',
        'error',
      )
    } finally {
      setCreatingToken(false)
    }
  }

  const handleRevokeToken = async (tokenId) => {
    setRevokingTokenId(tokenId)
    try {
      await axios.delete(`/api/auth/tokens/${tokenId}`)
      setTokens((current) => current.filter((token) => token.id !== tokenId))
      showToast('API token revoked.', 'success')
    } catch (error) {
      showToast(
        error.response?.data?.error || 'Failed to revoke API token.',
        'error',
      )
    } finally {
      setRevokingTokenId(null)
    }
  }

  const handleCopyToken = async (token) => {
    if (!navigator.clipboard?.writeText) {
      showToast('Clipboard access is not available in this browser.', 'error')
      return
    }

    try {
      await navigator.clipboard.writeText(token)
      showToast('API token copied.', 'success')
    } catch {
      showToast('Failed to copy API token.', 'error')
    }
  }

  if (authLoading || loading) return <LoadingScreen />

  return (
    <PageTransition>
      <div className="min-h-screen bg-surface text-text-primary p-4 md:p-12">
        <header className="max-w-5xl mx-auto mb-12 flex items-center gap-4">
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
          <h1 className="font-display text-display-md text-text-primary flex-1">
            My Uploads
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-surface-border text-text-muted text-sm font-body hover:border-accent hover:text-accent transition-colors duration-300"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Sign out
          </button>
        </header>

        <main className="max-w-5xl mx-auto space-y-12">
          <section className="grid gap-6 lg:grid-cols-[1.3fr,0.7fr]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="bg-surface-raised border border-surface-border rounded-3xl p-6 md:p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-accent/10 text-accent">
                  <KeyRound className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-display text-2xl text-text-primary">
                    CLI Access
                  </h2>
                  <p className="text-sm text-text-muted font-body mt-2 max-w-2xl">
                    Create a personal API token for authenticated uploads from
                    the `up` CLI. Tokens are only shown once, so copy them right
                    away and save them with `up setup` or `UP_TOKEN`.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <input
                  type="text"
                  value={tokenName}
                  onChange={(event) => setTokenName(event.target.value)}
                  placeholder="CLI token"
                  className="flex-1 px-4 py-3 bg-surface border border-surface-border rounded-2xl text-text-primary font-body text-sm outline-none focus:border-accent transition-colors duration-300 placeholder:text-text-muted"
                />
                <button
                  type="button"
                  onClick={handleCreateToken}
                  disabled={creatingToken}
                  className="px-5 py-3 rounded-2xl bg-accent text-surface font-body text-sm font-medium hover:bg-accent-hover transition-colors duration-300 disabled:opacity-50"
                >
                  {creatingToken ? 'Creating...' : 'Create token'}
                </button>
              </div>

              {newToken ? (
                <div className="mb-6 rounded-3xl border border-accent/30 bg-accent/5 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-accent font-body mb-2">
                        Copy this now
                      </p>
                      <code className="block break-all rounded-2xl bg-surface px-4 py-3 text-sm text-text-primary border border-surface-border">
                        {newToken}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyToken(newToken)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-surface-border text-text-secondary text-sm font-body hover:border-accent hover:text-accent transition-colors duration-300"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      Copy token
                    </button>
                  </div>
                  <p className="text-xs text-text-muted font-body mt-3">
                    Then run `up setup` in your terminal and paste the token
                    when prompted.
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                {tokens.length === 0 ? (
                  <p className="text-sm text-text-muted font-body">
                    No active API tokens yet.
                  </p>
                ) : (
                  tokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex flex-col gap-4 rounded-3xl border border-surface-border bg-surface px-5 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-body text-sm text-text-primary">
                          {token.name}
                        </p>
                        <p className="text-xs text-text-muted font-body mt-1">
                          {token.tokenPrefix}...
                        </p>
                        <p className="text-xs text-text-muted font-body mt-1">
                          {formatTokenTiming(token)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeToken(token.id)}
                        disabled={revokingTokenId === token.id}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-surface-border text-text-secondary text-sm font-body hover:border-red-400/50 hover:text-red-300 transition-colors duration-300 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        {revokingTokenId === token.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="bg-surface-raised border border-surface-border rounded-3xl p-6 md:p-8"
            >
              <h2 className="font-display text-xl text-text-primary mb-4">
                Setup Flow
              </h2>
              <div className="space-y-4 text-sm text-text-muted font-body">
                <p>1. Create a token here.</p>
                <p>2. Run `up setup` on the machine you want to authorize.</p>
                <p>
                  3. Paste the token when prompted, or set `UP_TOKEN` for CI and
                  scripts.
                </p>
                <p>
                  Existing tokens stay hidden after creation, so revoke and
                  recreate one if you lose it.
                </p>
              </div>
            </motion.aside>
          </section>

          {collections.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mt-20 flex flex-col items-center gap-3"
            >
              <p className="font-display text-3xl text-text-secondary">
                Nothing here yet.
              </p>
              <p className="text-sm text-text-muted font-body">
                Your uploads will appear here.
              </p>
              <Link
                to="/"
                className="text-sm text-text-muted hover:text-accent transition-colors duration-300 mt-2 font-body"
              >
                Upload something
              </Link>
            </motion.div>
          ) : (
            <motion.section
              variants={stagger}
              initial="hidden"
              animate="show"
            >
              <div className="mb-4">
                <h2 className="font-display text-2xl text-text-primary">
                  Recent Uploads
                </h2>
                <p className="text-sm text-text-muted font-body mt-2">
                  Collections you created with the web app or CLI.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((col) => (
                  <motion.div key={col.id} variants={fadeUp}>
                    <Link
                      to={`/c/${col.id}`}
                      aria-label={`View collection: ${col.title}`}
                      className="group block bg-surface-raised rounded-xl overflow-hidden transition-all duration-500 ease-luxury hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
                    >
                      <div className="aspect-[4/3] bg-surface flex items-center justify-center overflow-hidden">
                        {col.coverUrl ? (
                          <img
                            src={col.coverUrl}
                            alt="Cover"
                            loading="lazy"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-luxury"
                          />
                        ) : (
                          <div className="opacity-40">
                            <FileTypeIcon
                              type="application/octet-stream"
                              className="w-10 h-10"
                            />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-body font-medium text-text-primary truncate mb-1">
                          {col.title}
                        </h3>
                        <p className="text-xs text-text-muted font-body">
                          {col.fileCount} item
                          {col.fileCount !== 1 && 's'} &ndash;{' '}
                          {formatDistanceToNow(new Date(col.createdAt))} ago
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </main>

        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </PageTransition>
  )
}
