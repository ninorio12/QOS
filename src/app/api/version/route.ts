// Renvoie l'ID du déploiement courant (unique par déploiement Vercel). Le client compare cette
// valeur dans le temps : si elle change, c'est qu'un nouveau build est en ligne → propose de recharger.
// JAMAIS mis en cache (no-store) sinon le poll renverrait l'ancienne valeur.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const id =
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_BUILD_ID ||
    'dev'
  return new Response(JSON.stringify({ id }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store, max-age=0' },
  })
}
