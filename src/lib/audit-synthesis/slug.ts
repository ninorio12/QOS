// Petits helpers partagés (client + serveur) : pas d'import lourd ici.
export function slugify(s: string): string {
  return (s || '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'client'
}
// Bold Shift = livrable de référence peaufiné à la main (données bakées).
export function isBoldShift(s: string): boolean {
  return slugify(s).startsWith('bold-shift')
}
