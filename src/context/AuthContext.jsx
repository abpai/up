import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import PropTypes from 'prop-types'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios
      .get('/api/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password })
    setUser(res.data.user)
  }, [])

  const signup = useCallback(async (email, password) => {
    const res = await axios.post('/api/auth/signup', { email, password })
    setUser(res.data.user)
  }, [])

  const logout = useCallback(async () => {
    await axios.post('/api/auth/logout')
    setUser(null)
  }, [])

  const value = React.useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useAuth = () => useContext(AuthContext)
