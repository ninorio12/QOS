/**
 * Politique de confidentialité — page PUBLIQUE.
 *
 * Exigée par Meta pour tout formulaire de génération de leads : sans URL
 * accessible sans connexion, la création du formulaire est refusée. Elle décrit
 * uniquement ce que nous faisons réellement des données collectées.
 */

export const dynamic = 'force-static'

export const metadata = {
  title: 'Politique de confidentialité — VividFlow',
  description: 'Comment VividFlow collecte, utilise et protège les données personnelles.',
}

const MAJ = '31 juillet 2026'
const CONTACT = 'hey@vividflow.co'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-bold text-[#111111] mb-2">{title}</h2>
      <div className="text-[13.5px] leading-relaxed text-[#374151] flex flex-col gap-2">{children}</div>
    </section>
  )
}

export default function ConfidentialitePage() {
  return (
    <main className="min-h-screen bg-[#EEF0EB] px-5 py-12">
      <article className="max-w-[720px] mx-auto bg-white rounded-2xl border border-[#E5E7EB] px-7 py-8 shadow-sm">
        <h1 className="text-[22px] font-black tracking-tight text-[#111111]">Politique de confidentialité</h1>
        <p className="text-[12px] text-[#6B7280] mt-1">Dernière mise à jour : {MAJ}</p>

        <Section title="Qui est responsable de vos données">
          <p>
            VividFlow est responsable du traitement des données personnelles collectées via ses
            sites, ses formulaires publicitaires et ses outils. Pour toute question, écrivez à{' '}
            <a href={`mailto:${CONTACT}`} className="text-[#FF4D00] font-medium">{CONTACT}</a>.
          </p>
        </Section>

        <Section title="Les données que nous collectons">
          <p>
            Lorsque vous remplissez un de nos formulaires, y compris un formulaire publicitaire sur
            Facebook ou Instagram, nous collectons les informations que vous nous transmettez :
            nom et prénom, adresse email, numéro de téléphone, et le cas échéant vos réponses aux
            questions de qualification.
          </p>
          <p>
            Nous recevons également des informations techniques liées à votre visite, comme la
            page d&apos;origine et la campagne publicitaire concernée, afin de savoir d&apos;où vient
            votre demande.
          </p>
        </Section>

        <Section title="Pourquoi nous les utilisons">
          <p>
            Uniquement pour donner suite à votre demande : vous recontacter, organiser un rendez-vous,
            vous transmettre les informations que vous avez sollicitées et assurer le suivi de la
            relation commerciale qui en découle.
          </p>
          <p>
            La base légale est votre consentement, donné au moment où vous soumettez le formulaire,
            ainsi que notre intérêt légitime à répondre à une demande de contact.
          </p>
        </Section>

        <Section title="Ce que nous ne faisons pas">
          <p>
            Nous ne vendons pas vos données et nous ne les louons à personne. Elles ne sont pas
            utilisées à d&apos;autres fins que celles décrites ci-dessus.
          </p>
        </Section>

        <Section title="Avec qui elles sont partagées">
          <p>
            Vos données sont traitées par les prestataires techniques strictement nécessaires à notre
            activité : hébergement, base de données, messagerie, outils de prise de rendez-vous et de
            gestion de la relation client. Ces prestataires agissent pour notre compte et sont tenus
            aux mêmes obligations de confidentialité.
          </p>
          <p>
            Lorsque vous remplissez un formulaire sur Facebook ou Instagram, Meta traite également ces
            données selon sa propre politique de confidentialité.
          </p>
        </Section>

        <Section title="Combien de temps nous les gardons">
          <p>
            Trois ans à compter de notre dernier échange, sauf si vous nous demandez leur suppression
            avant, ou si une obligation légale impose une durée différente.
          </p>
        </Section>

        <Section title="Vos droits">
          <p>
            Vous pouvez à tout moment demander l&apos;accès à vos données, leur correction, leur
            suppression, la limitation de leur traitement, ou vous opposer à leur utilisation. Vous
            pouvez aussi retirer votre consentement à tout moment.
          </p>
          <p>
            Il suffit d&apos;écrire à{' '}
            <a href={`mailto:${CONTACT}`} className="text-[#FF4D00] font-medium">{CONTACT}</a>. Nous
            répondons dans un délai de trente jours.
          </p>
        </Section>

        <Section title="Sécurité">
          <p>
            L&apos;accès à vos données est restreint aux personnes qui en ont besoin, les échanges sont
            chiffrés, et nos outils sont protégés par authentification.
          </p>
        </Section>

        <p className="mt-9 pt-5 border-t border-[#E5E7EB] text-[12px] text-[#9CA3AF]">
          VividFlow · <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>
        </p>
      </article>
    </main>
  )
}
