// src/components/devis/PdfThumbnail.tsx
// Vignette miniature CSS simulant un document PDF A4

interface PdfThumbnailProps {
  pdfUrl: string | null
  numero: string | null
  montantTtc?: number | null
}

function fmtEUR(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

export default function PdfThumbnail({ pdfUrl, numero, montantTtc }: PdfThumbnailProps) {
  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span className="text-[9px] text-[#9CA3AF] font-semibold">PDF non généré</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      {/* Miniature A4 CSS — 82×116px */}
      <div className="w-[82px] h-[116px] bg-white rounded shadow-md overflow-hidden flex flex-col" style={{ transform: 'scale(0.95)' }}>
        {/* Header noir */}
        <div className="bg-[#111111] px-1.5 flex items-center justify-between flex-shrink-0" style={{ height: 22 }}>
          <span className="text-[#E2FF8D] font-black" style={{ fontSize: 5 }}>SOREN</span>
          <span className="text-white/60" style={{ fontSize: 5 }}>{numero ?? 'DEVIS'}</span>
        </div>
        {/* Body */}
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          {/* Lignes simulées */}
          <div className="h-[3px] bg-[#d1d5db] rounded-sm w-3/5" />
          <div className="h-[2px] bg-[#e5e7eb] rounded-sm w-2/5" />
          {/* Table simulée */}
          <div className="mt-1 flex flex-col gap-[2px]">
            {[0,1,2,3].map(i => (
              <div key={i} className="flex gap-[2px]">
                <div className={`h-[4px] rounded-[1px] flex-1 ${i === 0 ? 'bg-[#111111]' : 'bg-[#f3f4f6]'}`} />
                <div className={`h-[4px] rounded-[1px] ${i === 0 ? 'bg-[#111111]' : 'bg-[#f3f4f6]'}`} style={{ width: 12 }} />
                <div className={`h-[4px] rounded-[1px] ${i === 0 ? 'bg-[#111111]' : 'bg-[#f3f4f6]'}`} style={{ width: 16 }} />
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div className="bg-[#f0f0eb] px-1.5 flex items-center justify-end flex-shrink-0" style={{ height: 14 }}>
          {montantTtc != null && (
            <span className="font-black text-[#111111]" style={{ fontSize: 4 }}>{fmtEUR(montantTtc)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
