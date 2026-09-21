export const API_URL = 'http://localhost:8081'

export async function getCsrfToken() {
  const response = await fetch(`${API_URL}/api/auth/csrf`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('Unable to prepare the request. Please try again.')
  }
  return (await response.json()).token
}
