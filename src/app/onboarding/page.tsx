import OnboardingView from '@/components/bibliotheque/OnboardingView'

export default function OnboardingPage({ searchParams }: { searchParams: { contact?: string; name?: string } }) {
  const clientName = searchParams?.name ? decodeURIComponent(searchParams.name) : null

  return (
    <div className="h-full flex flex-col">
      {clientName && (
        <div className="flex-shrink-0 px-6 pt-5">
          <div className="flex items-center gap-2 bg-[#3462EE]/8 border border-[#3462EE]/20 rounded-xl px-4 py-2.5">
            <span className="text-[12px] font-semibold text-[#3462EE]">Formulaire onboarding —</span>
            <span className="text-[12px] font-bold text-soren-text">{clientName}</span>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <OnboardingView />
      </div>
    </div>
  )
}
