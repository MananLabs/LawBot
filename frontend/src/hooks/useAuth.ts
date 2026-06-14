import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { tokenStorage } from '@/lib/api'
import * as authApi from '@/api/auth'
import type {
  LoginPayload,
  RegisterPayload,
  User,
  PasswordResetPayload,
  PasswordResetConfirmPayload,
  ChangePasswordPayload,
} from '@/types'

// =====================================================================
// QUERY KEYS
// =====================================================================
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  subscription: () => [...authKeys.all, 'subscription'] as const,
  members: () => [...authKeys.all, 'members'] as const,
}

// =====================================================================
// MAIN useAuth HOOK
// =====================================================================
export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, isInitialized, login, logout, updateUser, setLoading } =
    useAuthStore()

  // ---------------------------------------------------------------
  // FETCH CURRENT USER
  // ---------------------------------------------------------------
  const {
    data: fetchedUser,
    isLoading: isLoadingUser,
    error: userError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: authKeys.me(),
    queryFn: authApi.getMe,
    enabled: isAuthenticated && isInitialized,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    select: (data: User) => data,
  })

  // Sync fetched user to Zustand store
  useEffect(() => {
    if (fetchedUser) {
      updateUser(fetchedUser)
    }
  }, [fetchedUser, updateUser])

  // Handle auth errors (e.g., token invalidated on server)
  useEffect(() => {
    if (userError) {
      // If we can't fetch the user, clear auth state
      tokenStorage.clearTokens()
      logout()
    }
  }, [userError, logout])

  // ---------------------------------------------------------------
  // LOGIN MUTATION
  // ---------------------------------------------------------------
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.user, data.tokens)
      queryClient.setQueryData(authKeys.me(), data.user)
      toast.success(`Welcome back, ${data.user.first_name}!`)
      navigate('/dashboard')
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      const message =
        error.response?.data?.detail ||
        'Invalid email or password. Please try again.'
      toast.error(message)
    },
  })

  // ---------------------------------------------------------------
  // REGISTER MUTATION
  // ---------------------------------------------------------------
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      login(data.user, data.tokens)
      queryClient.setQueryData(authKeys.me(), data.user)
      toast.success('Account created successfully! Welcome to LawBot.')
      navigate('/dashboard')
    },
    onError: (error: { response?: { data?: Record<string, unknown> } }) => {
      const errorData = error.response?.data
      if (errorData?.email) {
        toast.error('This email is already registered. Please log in.')
      } else {
        toast.error('Registration failed. Please check your details and try again.')
      }
    },
  })

  // ---------------------------------------------------------------
  // LOGOUT MUTATION
  // ---------------------------------------------------------------
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      logout()
      queryClient.clear() // Clear all cached queries
      toast.success('You have been logged out.')
      navigate('/login')
    },
    onError: () => {
      // Even if server logout fails, clear local state
      logout()
      queryClient.clear()
      navigate('/login')
    },
  })

  // ---------------------------------------------------------------
  // UPDATE PROFILE MUTATION
  // ---------------------------------------------------------------
  const updateProfileMutation = useMutation({
    mutationFn: (updates: Parameters<typeof authApi.updateProfile>[0]) =>
      authApi.updateProfile(updates),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser)
      queryClient.setQueryData(authKeys.me(), updatedUser)
      toast.success('Profile updated successfully.')
    },
    onError: () => {
      toast.error('Failed to update profile. Please try again.')
    },
  })

  // ---------------------------------------------------------------
  // CHANGE PASSWORD MUTATION
  // ---------------------------------------------------------------
  const changePasswordMutation = useMutation({
    mutationFn: (payload: ChangePasswordPayload) => authApi.changePassword(payload),
    onSuccess: () => {
      toast.success('Password changed successfully.')
    },
    onError: (error: { response?: { data?: { old_password?: string[] } } }) => {
      const errorData = error.response?.data
      if (errorData?.old_password) {
        toast.error('Current password is incorrect.')
      } else {
        toast.error('Failed to change password. Please try again.')
      }
    },
  })

  // ---------------------------------------------------------------
  // PASSWORD RESET MUTATIONS
  // ---------------------------------------------------------------
  const requestPasswordResetMutation = useMutation({
    mutationFn: (payload: PasswordResetPayload) => authApi.requestPasswordReset(payload),
    onSuccess: () => {
      toast.success('Password reset link sent to your email.')
    },
    onError: () => {
      toast.error('Failed to send reset email. Please try again.')
    },
  })

  const confirmPasswordResetMutation = useMutation({
    mutationFn: (payload: PasswordResetConfirmPayload) =>
      authApi.confirmPasswordReset(payload),
    onSuccess: () => {
      toast.success('Password reset successfully. Please log in.')
      navigate('/login')
    },
    onError: () => {
      toast.error('Invalid or expired reset link. Please request a new one.')
    },
  })

  // ---------------------------------------------------------------
  // AVATAR UPLOAD MUTATION
  // ---------------------------------------------------------------
  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => authApi.updateAvatar(file),
    onSuccess: ({ avatar }) => {
      updateUser({ avatar })
      toast.success('Profile photo updated.')
    },
    onError: () => {
      toast.error('Failed to upload photo. Please try again.')
    },
  })

  // ---------------------------------------------------------------
  // CONVENIENCE FUNCTIONS
  // ---------------------------------------------------------------
  const handleLogin = useCallback(
    (payload: LoginPayload) => {
      setLoading(true)
      loginMutation.mutate(payload)
    },
    [loginMutation, setLoading],
  )

  const handleRegister = useCallback(
    (payload: RegisterPayload) => {
      setLoading(true)
      registerMutation.mutate(payload)
    },
    [registerMutation, setLoading],
  )

  const handleLogout = useCallback(() => {
    logoutMutation.mutate()
  }, [logoutMutation])

  const handleUpdateProfile = useCallback(
    (updates: Parameters<typeof authApi.updateProfile>[0]) => {
      updateProfileMutation.mutate(updates)
    },
    [updateProfileMutation],
  )

  const handleChangePassword = useCallback(
    (payload: ChangePasswordPayload) => {
      changePasswordMutation.mutate(payload)
    },
    [changePasswordMutation],
  )

  return {
    // State
    user: user || fetchedUser || null,
    isAuthenticated,
    isInitialized,
    isLoading: isLoadingUser,

    // Login
    login: handleLogin,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    // Register
    register: handleRegister,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    // Logout
    logout: handleLogout,
    isLoggingOut: logoutMutation.isPending,

    // Profile
    updateProfile: handleUpdateProfile,
    isUpdatingProfile: updateProfileMutation.isPending,
    uploadAvatar: uploadAvatarMutation.mutate,
    isUploadingAvatar: uploadAvatarMutation.isPending,

    // Password
    changePassword: handleChangePassword,
    isChangingPassword: changePasswordMutation.isPending,
    requestPasswordReset: requestPasswordResetMutation.mutate,
    isSendingReset: requestPasswordResetMutation.isPending,
    confirmPasswordReset: confirmPasswordResetMutation.mutate,
    isConfirmingReset: confirmPasswordResetMutation.isPending,

    // Refetch
    refetchUser,
  }
}

// =====================================================================
// SUBSCRIPTION HOOK
// =====================================================================
export function useSubscription() {
  const { isAuthenticated } = useAuthStore()

  const { data: subscription, isLoading } = useQuery({
    queryKey: authKeys.subscription(),
    queryFn: authApi.getSubscription,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  })

  const upgradeMutation = useMutation({
    mutationFn: authApi.createSubscriptionOrder,
    onSuccess: (order) => {
      // Integration with Razorpay would go here
      console.log('Order created:', order)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: authApi.cancelSubscription,
    onSuccess: () => {
      toast.success('Subscription cancelled. You retain access until period end.')
    },
    onError: () => {
      toast.error('Failed to cancel subscription. Please contact support.')
    },
  })

  return {
    subscription,
    isLoading,
    upgrade: upgradeMutation.mutate,
    isUpgrading: upgradeMutation.isPending,
    cancel: cancelMutation.mutate,
    isCanceling: cancelMutation.isPending,
  }
}

// =====================================================================
// TEAM MEMBERS HOOK
// =====================================================================
export function useTeamMembers() {
  const { isAuthenticated, user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const { data: members = [], isLoading } = useQuery({
    queryKey: authKeys.members(),
    queryFn: authApi.getOrganizationMembers,
    enabled: isAuthenticated && isAdmin,
  })

  const inviteMutation = useMutation({
    mutationFn: authApi.inviteTeamMember,
    onSuccess: () => {
      toast.success('Invitation sent successfully.')
    },
    onError: () => {
      toast.error('Failed to send invitation. Please try again.')
    },
  })

  const removeMutation = useMutation({
    mutationFn: authApi.removeTeamMember,
    onSuccess: () => {
      toast.success('Team member removed.')
    },
    onError: () => {
      toast.error('Failed to remove team member. Please try again.')
    },
  })

  return {
    members,
    isLoading,
    invite: inviteMutation.mutate,
    isInviting: inviteMutation.isPending,
    remove: removeMutation.mutate,
    isRemoving: removeMutation.isPending,
  }
}
