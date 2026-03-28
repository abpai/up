import React from 'react'
import { motion } from 'framer-motion'
import PageTransition from './PageTransition'

export default function LoadingScreen() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <motion.p
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="font-display text-display-md text-text-muted"
        >
          Loading
        </motion.p>
      </div>
    </PageTransition>
  )
}
