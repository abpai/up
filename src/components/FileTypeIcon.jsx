import React from 'react'
import PropTypes from 'prop-types'
import {
  File,
  FileText,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
} from 'lucide-react'

const MIME_MAP = [
  { test: (t) => t.startsWith('video/'), Icon: FileVideo },
  { test: (t) => t.startsWith('audio/'), Icon: FileAudio },
  { test: (t) => t === 'application/pdf', Icon: FileText },
  {
    test: (t) =>
      [
        'application/zip',
        'application/x-rar',
        'application/gzip',
        'application/x-tar',
        'application/x-7z-compressed',
      ].includes(t),
    Icon: FileArchive,
  },
  {
    test: (t) =>
      t.startsWith('text/') ||
      [
        'application/json',
        'application/javascript',
        'application/xml',
        'application/typescript',
      ].includes(t),
    Icon: FileCode,
  },
]

export default function FileTypeIcon({ type, className = 'w-10 h-10' }) {
  const match = MIME_MAP.find((m) => m.test(type))
  const Icon = match ? match.Icon : File
  return <Icon className={`${className} text-text-muted`} />
}

FileTypeIcon.propTypes = {
  type: PropTypes.string.isRequired,
  className: PropTypes.string,
}
