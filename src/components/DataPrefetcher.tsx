'use client'

import { useEffect } from 'react'
import { preload } from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CRITICAL_ENDPOINTS = [
  '/api/dashboard',
  '/api/conversations/list',
  '/api/calendrier',
  '/api/devis/list',
]

export default function DataPrefetcher() {
  useEffect(() => {
    for (const url of CRITICAL_ENDPOINTS) {
      preload(url, fetcher)
    }
  }, [])

  return null
}
