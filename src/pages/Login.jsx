import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageTransition from '../components/PageTransition'
import Toast, { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'

const MODE = { LOGIN: 'login', SIGNUP: 'signup' }

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function Login() {
  const [mode, setMode] = useState(MODE.LOGIN)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user, loading, login, signup } = useAuth()
  const { toast, show: showToast, dismiss: dismissToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const redirect = searchParams.get('redirect') || '/'

  useEffect(() => {
    if (!loading && user) {
      navigate(redirect, { replace: true })
    }
  }, [loading, user, navigate, redirect])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (mode === MODE.SIGNUP) {
        await signup(email, password)
      } else {
        await login(email, password)
      }
      navigate(redirect, { replace: true })
    } catch (err) {
      const message =
        err.response?.data?.error || 'Something went wrong. Try again.'
      showToast(message, 'error')
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <PageTransition>
      <div className="min-h-screen bg-surface text-text-primary flex flex-col items-center justify-center p-4">
        <motion.form
          variants={container}
          initial="hidden"
          animate="show"
          onSubmit={handleSubmit}
          className="w-full max-w-sm flex flex-col gap-6"
        >
          <motion.div variants={item} className="text-center mb-4">
            <Link to="/" className="font-display text-display-md text-text-primary">
              Up
            </Link>
            <p className="text-sm text-text-muted font-body mt-2">
              {mode === MODE.LOGIN
                ? 'Sign in to upload files'
                : 'Create an account'}
            </p>
          </motion.div>

          <motion.div variants={item}>
            <label
              htmlFor="email"
              className="block text-xs text-text-muted font-body mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-surface-raised border border-surface-border rounded-lg text-text-primary font-body text-sm outline-none focus:border-accent transition-colors duration-300 placeholder:text-text-muted"
              placeholder="you@example.com"
            />
          </motion.div>

          <motion.div variants={item}>
            <label
              htmlFor="password"
              className="block text-xs text-text-muted font-body mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={
                mode === MODE.SIGNUP ? 'new-password' : 'current-password'
              }
              className="w-full px-4 py-3 bg-surface-raised border border-surface-border rounded-lg text-text-primary font-body text-sm outline-none focus:border-accent transition-colors duration-300 placeholder:text-text-muted"
              placeholder={
                mode === MODE.SIGNUP ? '8 characters minimum' : 'Your password'
              }
            />
          </motion.div>

          <motion.div variants={item}>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full bg-accent text-surface font-body font-medium text-sm hover:bg-accent-hover transition-colors duration-300 active:scale-[0.97] disabled:opacity-50"
            >
              {submitting
                ? 'Please wait...'
                : mode === MODE.LOGIN
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </motion.div>

          <motion.p
            variants={item}
            className="text-center text-sm text-text-muted font-body"
          >
            {mode === MODE.LOGIN ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => setMode(MODE.SIGNUP)}
                  className="text-text-secondary hover:text-accent transition-colors duration-300"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode(MODE.LOGIN)}
                  className="text-text-secondary hover:text-accent transition-colors duration-300"
                >
                  Sign in
                </button>
              </>
            )}
          </motion.p>
        </motion.form>

        <Toast toast={toast} onDismiss={dismissToast} />
      </div>
    </PageTransition>
  )
}
