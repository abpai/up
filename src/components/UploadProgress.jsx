import React from 'react'
import PropTypes from 'prop-types'
import { motion } from 'framer-motion'

export default function UploadProgress({ fileCount }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-8 w-full max-w-md"
    >
      <div className="w-full h-0.5 bg-surface-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-accent/60 via-accent to-accent/60 rounded-full"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ width: '40%' }}
        />
      </div>
      <p className="text-text-secondary text-sm font-body">
        Uploading{fileCount > 1 ? ` ${fileCount} files` : ''}...
      </p>
    </motion.div>
  )
}

UploadProgress.propTypes = {
  fileCount: PropTypes.number,
}
