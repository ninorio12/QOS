/**
 * Wrapper fetch qui garantit une réponse JSON propre.
 * Si le serveur renvoie du HTML (erreur 500, 404, etc.) on lève une erreur lisible.
 */
export async function fetchJSON<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options)

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new Error(`Erreur serveur (${res.status})`)
  }

  const data = await res.json() as T & { error?: string }

  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`)
  }

  return data
}
