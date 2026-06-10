'use client'

import { useState } from 'react'
import { ChevronRight, ExternalLink, GitFork, Globe, ArrowLeft, Plus } from 'lucide-react'

type FileItem = { id: string; name: string; url?: string; description?: string }
type Folder   = { id: string; name: string; icon: string; gradient: string[]; items: FileItem[] }
type RootFolder = { id: string; name: string; icon: string; gradient: string[]; folders?: Folder[]; items?: FileItem[] }

const ROOT_FOLDERS: RootFolder[] = [
  {
    id: 'vercel',
    name: 'Projets Vercel',
    icon: '▲',
    gradient: ['#000000', '#1a1a1a'],
    items: [
      { id: 'v1', name: 'vividflow-service-execution-os', url: 'https://vividflow-service-execution-os.vercel.app', description: 'QOS principal' },
      { id: 'v2', name: 'vividflow-deck',                 url: 'https://vividflow-deck.vercel.app',                description: 'Deck de présentation' },
      { id: 'v3', name: 'vividflow-onboarding',           url: 'https://vividflow-onboarding.vercel.app',          description: 'Onboarding client' },
      { id: 'v4', name: 'vividflow-strategy',             url: 'https://vividflow-strategy.vercel.app',            description: 'Stratégie' },
    ],
  },
  {
    id: 'github',
    name: 'Repositories Github',
    icon: '',
    gradient: ['#1f2937', '#374151'],
    items: [
      { id: 'g1', name: 'QOS',          description: 'Service Execution OS' },
      { id: 'g2', name: 'vividflow-ai', description: 'Agents IA' },
    ],
  },
]

// iOS-style folder icon
function FolderIcon({ folder, size = 80 }: { folder: { icon: string; gradient: string[]; name: string }; size?: number }) {
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Shadow layers */}
      <div className="absolute inset-x-2 bottom-0 h-4 rounded-xl opacity-20" style={{ background: folder.gradient[0] }} />
      {/* Main folder */}
      <div
        className="absolute inset-0 rounded-2xl flex items-center justify-center text-white shadow-lg"
        style={{ background: `linear-gradient(145deg, ${folder.gradient[0]}, ${folder.gradient[1]})` }}
      >
        {folder.icon === '' ? (
          <GitFork size={size * 0.42} className="text-white" />
        ) : folder.icon === '▲' ? (
          <span style={{ fontSize: size * 0.38, fontWeight: 900, color: 'white', lineHeight: 1 }}>▲</span>
        ) : (
          <span style={{ fontSize: size * 0.42 }}>{folder.icon}</span>
        )}
      </div>
    </div>
  )
}

function FileCard({ item, isVercel, isGithub }: { item: FileItem; isVercel: boolean; isGithub: boolean }) {
  return (
    <div className="bg-soren-card border border-soren-border rounded-2xl p-4 flex items-center justify-between gap-3 hover:shadow-md hover:border-[#C8CBD0] transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isVercel ? '#000' : '#1f2937' }}>
          {isVercel ? <Globe size={16} className="text-white" /> : <GitFork size={16} className="text-white" />}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-normal text-soren-text truncate">{item.name}</p>
          {item.description && <p className="text-[11px] text-soren-subtle truncate">{item.description}</p>}
        </div>
      </div>
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-soren-subtle hover:text-soren-text hover:bg-soren-elevated transition-colors opacity-0 group-hover:opacity-100">
          <ExternalLink size={13} />
        </a>
      )}
    </div>
  )
}

export default function ProjetsView() {
  const [openFolder, setOpenFolder] = useState<RootFolder | null>(null)

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0 flex items-center gap-3">
        {openFolder && (
          <button onClick={() => setOpenFolder(null)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-soren-elevated transition-colors">
            <ArrowLeft size={16} className="text-soren-muted" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2 text-sm text-soren-subtle mb-0.5">
            <span className="cursor-pointer hover:text-soren-text" onClick={() => setOpenFolder(null)}>Projets</span>
            {openFolder && <><ChevronRight size={12} /><span className="text-soren-text font-medium">{openFolder.name}</span></>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {!openFolder ? (
          /* Root folder grid */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6" data-stagger>
            {ROOT_FOLDERS.map(folder => (
              <button
                key={folder.id}
                onClick={() => setOpenFolder(folder)}
                className="flex flex-col items-center gap-2.5 group cursor-pointer"
              >
                <div className="transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
                  <FolderIcon folder={folder} size={80} />
                </div>
                <span className="text-[12px] font-medium text-soren-text text-center leading-tight max-w-[90px]">
                  {folder.name}
                </span>
                <span className="text-[10px] text-soren-subtle">
                  {(folder.items ?? []).length} éléments
                </span>
              </button>
            ))}

            {/* Add folder */}
            <button className="flex flex-col items-center gap-2.5 group cursor-pointer opacity-40 hover:opacity-70 transition-opacity">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-soren-border flex items-center justify-center">
                <Plus size={24} className="text-soren-subtle" />
              </div>
              <span className="text-[12px] font-medium text-soren-muted">Nouveau</span>
            </button>
          </div>
        ) : (
          /* Folder contents */
          <div className="flex flex-col gap-2 max-w-2xl" data-stagger>
            {(openFolder.items ?? []).map(item => (
              <FileCard
                key={item.id}
                item={item}
                isVercel={openFolder.id === 'vercel'}
                isGithub={openFolder.id === 'github'}
              />
            ))}
            <button className="mt-2 flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-soren-border text-soren-subtle hover:text-soren-text hover:border-soren-text/30 transition-colors text-sm">
              <Plus size={14} />
              Ajouter un élément
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
