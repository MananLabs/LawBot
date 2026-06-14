import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { tokenStorage } from '@/lib/api'
import type { User, AuthTokens } from '@/types'

// =====================================================================
// AUTH STORE INTERFACE
// =====================================================================
interface AuthState {
  // State
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  setUser: (user: User) => void
  setTokens: (tokens: AuthTokens) => void
  login: (user: User, tokens: AuthTokens) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  clearError: () => void
  setLoading: (loading: boolean) => void
  initializeAuth: () => void
}

// =====================================================================
// ZUSTAND STORE
// =====================================================================
export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,

    // -------------------------
    // SET USER
    // -------------------------
    setUser: (user: User) => {
      set({ user, isAuthenticated: true })
    },

    // -------------------------
    // SET TOKENS
    // -------------------------
    setTokens: (tokens: AuthTokens) => {
      set({ tokens })
      tokenStorage.setTokens(tokens.access, tokens.refresh)
    },

    // -------------------------
    // LOGIN — set user + tokens
    // -------------------------
    login: (user: User, tokens: AuthTokens) => {
      tokenStorage.setTokens(tokens.access, tokens.refresh)
      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isInitialized: true,
      })
    },

    // -------------------------
    // LOGOUT — clear all state
    // -------------------------
    logout: () => {
      tokenStorage.clearTokens()
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isInitialized: true,
      })
    },

    // -------------------------
    // UPDATE USER (partial)
    // -------------------------
    updateUser: (updates: Partial<User>) => {
      const currentUser = get().user
      if (currentUser) {
        set({ user: { ...currentUser, ...updates } })
      }
    },

    // -------------------------
    // CLEAR ERROR
    // -------------------------
    clearError: () => set({ error: null }),

    // -------------------------
    // SET LOADING
    // -------------------------
    setLoading: (loading: boolean) => set({ isLoading: loading }),

    // -------------------------
    // INITIALIZE FROM STORAGE
    // Called on app startup to check if user is already logged in
    // -------------------------
    initializeAuth: () => {
      const hasToken = tokenStorage.hasTokens()

      if (!hasToken) {
        set({ isInitialized: true, isAuthenticated: false })
        return
      }

      // Token exists — mark as potentially authenticated
      // The actual user data will be fetched by the useAuth hook
      set({
        isInitialized: true,
        isAuthenticated: true,
        tokens: {
          access: tokenStorage.getAccessToken() ?? '',
          refresh: tokenStorage.getRefreshToken() ?? '',
        },
      })
    },
  })),
)

// =====================================================================
// SELECTORS (for performance — avoid unnecessary re-renders)
// =====================================================================
export const selectUser = (state: AuthState) => state.user
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectIsLoading = (state: AuthState) => state.isLoading
export const selectIsInitialized = (state: AuthState) => state.isInitialized
export const selectAuthError = (state: AuthState) => state.error

// =====================================================================
// TYPED SELECTORS FOR SUBSCRIPTION INFO
// =====================================================================
export const selectSubscriptionTier = (state: AuthState) =>
  state.user?.subscription?.tier ?? 'free'

export const selectSubscriptionUsage = (state: AuthState) => state.user?.subscription?.usage

export const selectSubscriptionLimits = (state: AuthState) => state.user?.subscription?.limits

export const selectIsSubscribed = (state: AuthState) => {
  const tier = state.user?.subscription?.tier
  return tier && tier !== 'free'
}

export const selectCanAccessFeature = (feature: 'deep_analysis' | 'team' | 'api') => {
  return (state: AuthState) => {
    const tier = state.user?.subscription?.tier
    switch (feature) {
      case 'deep_analysis':
        return tier === 'professional' || tier === 'enterprise'
      case 'team':
        return tier === 'enterprise'
      case 'api':
        return tier === 'enterprise'
      default:
        return false
    }
  }
}
