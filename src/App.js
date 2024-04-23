import React, { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

import s from './App.module.css'

function App() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const upload = async (file) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const url = `${process.env.REACT_APP_UPLOADER_URL}/upload`
      const response = await axios.post(url, formData, {
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          )
          setUploadProgress(progress)
        },
      })

      const { fileUrl } = response.data
      const { pathname } = new URL(fileUrl)
      if (response.status === 200)
        setUploadSuccess(`https://static.r2pi.co${pathname}`)
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0]
    upload(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const onPaste = async (e) => {
    // Prevent the default behavior, so you can code your own logic.
    e.preventDefault()
    if (!e.clipboardData.files.length) {
      return
    }

    upload(e.clipboardData.files[0])
  }

  useEffect(() => {
    document.addEventListener('paste', onPaste)

    return () => {
      document.removeEventListener('paste', onPaste)
    }
  }, [])

  return (
    <div className={s.container}>
      {!uploadSuccess ? (
        <div {...getRootProps()} className={s.dropzone}>
          <input {...getInputProps()} />

          {isDragActive ? (
            <p>Drop the file here...</p>
          ) : (
            <div className={s.uploadBox}>
              <p>Drag and drop a file here, or click to select a file</p>
              <div className={s.iconRow}>
                <span className={s.icon}>🎵</span>
                <span className={s.icon}>📁</span>
                <span className={s.icon}>🔗</span>
                <span className={s.icon}>📊</span>
                <span className={s.icon}>🖼️</span>
              </div>
            </div>
          )}

          {uploadProgress > 0 && (
            <progress value={uploadProgress} max="100">
              {uploadProgress}%
            </progress>
          )}
        </div>
      ) : null}

      {uploadSuccess ? (
        <div>
          <div className={s.success}>Success! You can view it here:</div>
          <div>
            <a className={s.link} href={uploadSuccess}>
              {uploadSuccess}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
