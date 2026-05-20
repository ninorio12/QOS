'use client'

import { useEffect } from 'react'
import { preload } from 'swr'

// Fetcher sécurisé qui gère les erreurs
const safeFetcher = async (url: string) => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`DataPrefetcher: ${url} returned ${response.status}`)
      return null
    }
    
    const text = await response.text()
    if (!text) {
      console.warn(`DataPrefetcher: ${url} returned empty response`)
      return null
    }
    
    return JSON.parse(text)
  } catch (error) {
    console.warn(`DataPrefetcher: Failed to fetch ${url}:`, error)
    return null
  }
}

const CRITICAL_ENDPOINTS = [
  '/api/dashboard',
  '/api/conversations/list', 
  '/api/devis/list',
]

export default function DataPrefetcher() {
  useEffect(() => {
    // Précharge seulement les APIs qui fonctionnent
    for (const url of CRITICAL_ENDPOINTS) {
      preload(url, safeFetcher).catch(() => {
        // Ignore les erreurs de préchargement
      })
    }
  }, [])

  return null
}