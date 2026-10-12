import { createContext, useContext } from 'react'

export const AuthContext = createContext({ openAuth: () => {} })

export function useAuth() {
  return useContext(AuthContext)
}