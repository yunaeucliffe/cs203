import { API_URL, getCsrfToken } from '../api.js'

const DELETE_FAILED = 'Unable to delete your account. Please try again.'

export async function deleteAccount() {
  let response
  try {
    const token = await getCsrfToken()
    response = await fetch(`${API_URL}/api/users/me`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-XSRF-TOKEN': token },
    })
  } catch (error) {
    throw new Error(DELETE_FAILED, { cause: error })
  }
  if (response.status === 401) throw new Error('Your session has expired. Please sign in again.')
  if (!response.ok) throw new Error(DELETE_FAILED)
}
