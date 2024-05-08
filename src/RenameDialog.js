import React, { useState } from 'react'
import PropTypes from 'prop-types'
import cn from 'classnames'

import s from './RenameDialog.module.css'

const RenameDialog = ({ file, onRename, onCancel }) => {
  const [newName, setNewName] = useState(file?.name || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onRename(newName)
  }

  return (
    <div className={s.dialogContainer}>
      <div className={s.dialog}>
        <div className={s.dialogHeader}>
          <h3 className={s.dialogTitle}>Rename File</h3>
          <button
            className={cn(s.button, s.closeButton)}
            type="button"
            aria-hidden
            onClick={onCancel}
          >
            &times;
          </button>
        </div>
        <div className={s.dialogBody}>
          <form className={s.form} onSubmit={handleSubmit}>
            <input
              className={s.input}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className={cn(s.button, s.submitButton)} type="submit">
              Rename
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

RenameDialog.propTypes = {
  file: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  onRename: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
}

export default RenameDialog
