import { apiPost, apiGet, tokenStorage } from '@/lib/api'
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  User,
  PasswordResetPayload,
  PasswordResetConfirmPayload,
  ChangePasswordPayload,
  AuthTokens,
} from '@/types'

// =====================================================================
// AUTH API ENDPOINTS
// =====================================================================

/**
 * Log in with email and password.
 * Returns user profile + JWT tokens.
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/login/', payload)
}

/**
 * Register a new user account.
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/register/', payload)
}

/**
 * Log out the current user (invalidates refresh token on server).
 */
export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (refreshToken) {
    try {
      await apiPost<void>('/auth/logout/', { refresh: refreshToken })
    } catch {
      // Ignore server errors on logout — we clear local state regardless
    }
  }
  tokenStorage.clearTokens()
}

/**
 * Refresh the access token using the refresh token.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  return apiPost<AuthTokens>('/auth/token/refresh/', { refresh: refreshToken })
}

/**
 * Get the current authenticated user's profile.
 */
export async function getMe(): Promise<User> {
  return apiGet<User>('/auth/me/')
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(
  updates: Partial<Pick<User, 'first_name' | 'last_name' | 'phone' | 'preferences'>>,
): Promise<User> {
  return apiPost<User>('/auth/me/update/', updates)
}

/**
 * Upload a new avatar image for the current user.
 */
export async function updateAvatar(file: File): Promise<{ avatar: string }> {
  const formData = new FormData()
  formData.append('avatar', file)

  const { uploadApi } = await import('@/lib/api')
  const response = await uploadApi.patch<{ avatar: string }>('/auth/me/avatar/', formData)
  return response.data
}

/**
 * Request a password reset email.
 */
export async function requestPasswordReset(payload: PasswordResetPayload): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/auth/password/reset/', payload)
}

/**
 * Confirm a password reset with the token from email.
 */
export async function confirmPasswordReset(
  payload: PasswordResetConfirmPayload,
): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/auth/password/reset/confirm/', payload)
}

/**
 * Change the current user's password (requires old password).
 */
export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/auth/password/change/', payload)
}

/**
 * Verify the email address with the token from email.
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/auth/email/verify/', { token })
}

/**
 * Resend the email verification link.
 */
export async function resendVerificationEmail(): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/auth/email/verify/resend/')
}

/**
 * Get user's subscription details.
 */
export async function getSubscription(): Promise<User['subscription']> {
  return apiGet<User['subscription']>('/auth/subscription/')
}

/**
 * Initiate Razorpay subscription upgrade.
 */
export async function createSubscriptionOrder(
  tier: 'starter' | 'professional' | 'enterprise',
): Promise<{
  order_id: string
  amount: number
  currency: string
  key: string
  subscription_id: string
}> {
  return apiPost('/auth/subscription/create/', { tier })
}

/**
 * Verify and activate subscription after payment.
 */
export async function verifySubscriptionPayment(payload: {
  razorpay_payment_id: string
  razorpay_subscription_id: string
  razorpay_signature: string
}): Promise<{ message: string; subscription: User['subscription'] }> {
  return apiPost('/auth/subscription/verify/', payload)
}

/**
 * Cancel the current subscription.
 */
export async function cancelSubscription(): Promise<{ message: string }> {
  return apiPost('/auth/subscription/cancel/')
}

/**
 * Get all users in the organization (admin only).
 */
export async function getOrganizationMembers(): Promise<User[]> {
  return apiGet<User[]>('/auth/organization/members/')
}

/**
 * Invite a new team member.
 */
export async function inviteTeamMember(payload: {
  email: string
  role: User['role']
  message?: string
}): Promise<{ message: string }> {
  return apiPost('/auth/organization/invite/', payload)
}

/**
 * Remove a team member from the organization.
 */
export async function removeTeamMember(userId: string): Promise<void> {
  return apiPost(`/auth/organization/members/${userId}/remove/`)
}

/**
 * Check if an email is already registered (for registration form validation).
 */
export async function checkEmailAvailability(email: string): Promise<{ available: boolean }> {
  return apiPost<{ available: boolean }>('/auth/email/check/', { email })
}
