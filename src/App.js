import React, { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'

import RenameDialog from './RenameDialog'

import s from './App.module.css'

function App() {
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [pastedFile, setPastedFile] = useState(null)
  const [showRenameDialog, setShowRenameDialog] = useState(false)

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
        setUploadSuccess(`https://static.andypai.me${pathname}`)
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
    e.preventDefault()
    if (!e.clipboardData.files.length) return

    setPastedFile(e.clipboardData.files[0])
    setShowRenameDialog(true)
  }

  const onCopy = async () => {
    navigator.clipboard.writeText(uploadSuccess)
  }

  const handleRename = (newName) => {
    const renamedFile = new File([pastedFile], newName, {
      type: pastedFile.type,
    })
    upload(renamedFile)
    setPastedFile(null)
    setShowRenameDialog(false)
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
            <a
              className={s.link}
              target="_blank"
              href={uploadSuccess}
              rel="noreferrer"
            >
              {uploadSuccess}
            </a>
            <button className={s.copyButton} type="button" onClick={onCopy}>
              📋
            </button>
          </div>
          <a href="/" className={s.refresh}>
            Upload another file →
          </a>
        </div>
      ) : null}

      {showRenameDialog && (
        <RenameDialog
          file={pastedFile}
          onRename={handleRename}
          onCancel={() => setShowRenameDialog(false)}
        />
      )}
    </div>
  )
}

export default App
