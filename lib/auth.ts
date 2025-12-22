export const storeToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("access_token", token)
  }
}

export const getStoredToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token")
  }
  return null
}

export const removeToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token")
    localStorage.removeItem("userId")
  }
}
