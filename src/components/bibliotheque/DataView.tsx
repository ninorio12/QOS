'use client'

import { useState } from 'react'
import { ArrowLeft, ChevronRight, Plus, Upload, FileText, Image, Code, Pen, GitFork } from 'lucide-react'

type DataItem = { id: string; name: string; size?: string; date?: string }
type DataFolder = {
  id: string
  name: string
  ext: string
  icon: React.ReactNode
  color: string
  bg: string
  count: number
  items: DataItem[]
}

const DATA_FOLDERS: DataFolder[] = [
  {
    id: 'pdf',
    name: 'PDF',
    ext: '.pdf',
    icon: <FileText size={22} />,
    color: '#DC2626',
    bg: '#FEF2F2',
    count: 0,
    items: [],
  },
  {
    id: 'png',
    name: 'Images',
    ext: '.png / .jpg',
    icon: <Image size={22} />,
    color: '#2563EB',
    bg: '#EFF6FF',
    count: 0,
    items: [],
  },
  {
    id: 'md',
    name: 'Markdown',
    ext: '.md',
    icon: <Code size={22} />,
    color: '#7C3AED',
    bg: '#F5F3FF',
    count: 0,
    items: [],
  },
  {
    id: 'svg',
    name: 'SVG',
    ext: '.svg',
    icon: <Pen size={22} />,
    color: '#0891B2',
    bg: '#ECFEFF',
    count: 0,
    items: [],
  },
  {
    id: 'notion',
    name: 'Notion',
    ext: 'Notion',
    icon: <span className="text-[20px] font-black leading-none">N</span>,
    color: '#111111',
    bg: '#F9FAFB',
    count: 0,
    items: [],
  },
  {
    id: 'github',
    name: 'Repositories Github',
    ext: 'Git',
    icon: <GitFork size={22} />,
    color: '#374151',
    bg: '#F3F4F6',
    count: 2,
    items: [
      { id: 'g1', name: 'QOS — Service Execution OS' },
      { id: 'g2', name: 'vividflow-ai — Agents IA' },
    ],
  },
]

function FolderCard({ folder, onClick }: { folder: DataFolder; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-soren-card border border-soren-border rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all duration-150"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: folder.bg, color: folder.color }}
        >
          {folder.icon}
        </div>
        <span className="text-[10px] font-semibold text-soren-subtle bg-soren-elevated px-2 py-0.5 rounded-full">
          {folder.count} fichiers
        </span>
      </div>
      <div>
        <p className="text-[15px] font-bold text-soren-text">{folder.name}</p>
        <p className="text-[11px] text-soren-subtle mt-0.5">{folder.ext}</p>
      </div>
    </div>
  )
}

export default function DataView() {
  const [openFolder, setOpenFolder] = useState<DataFolder | null>(null)

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
            <span className="cursor-pointer hover:text-soren-text" onClick={() => setOpenFolder(null)}>Data</span>
            {openFolder && <><ChevronRight size={12} /><span className="text-soren-text font-medium">{openFolder.name}</span></>}
          </div>
        </div>
        {openFolder && (
          <label className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-[#FF4D00] text-white cursor-pointer hover:bg-[#e64500] transition-colors">
            <Upload size={12} />
            Importer
            <input type="file" className="hidden" multiple />
          </label>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {!openFolder ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {DATA_FOLDERS.map(folder => (
              <FolderCard key={folder.id} folder={folder} onClick={() => setOpenFolder(folder)} />
            ))}
          </div>
        ) : (
          <div className="max-w-2xl">
            {openFolder.items.length === 0 ? (
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-soren-border rounded-2xl py-16 cursor-pointer hover:border-[#FF4D00]/40 hover:bg-[#FF4D00]/5 transition-all">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: openFolder.bg, color: openFolder.color }}>
                  {openFolder.icon}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-soren-text">Déposer des fichiers ici</p>
                  <p className="text-[11px] text-soren-subtle mt-0.5">ou cliquer pour importer des {openFolder.ext}</p>
                </div>
                <input type="file" className="hidden" multiple />
              </label>
            ) : (
              <div className="flex flex-col gap-2">
                {openFolder.items.map(item => (
                  <div key={item.id} className="bg-soren-card border border-soren-border rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: openFolder.bg, color: openFolder.color }}>
                      {openFolder.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-soren-text truncate">{item.name}</p>
                      {item.size && <p className="text-[10px] text-soren-subtle">{item.size}</p>}
                    </div>
                    {item.date && <span className="text-[10px] text-soren-subtle flex-shrink-0">{item.date}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
