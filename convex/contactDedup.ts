// convex/contactDedup.ts
import { type Id } from "./_generated/dataModel"
const digits = (s?: string | null) => (s || "").replace(/\D/g, "")
const norm = (s?: string | null) => (s || "").toLowerCase().trim()

// Retourne l'_id d'un contact existant correspondant, sinon null.
// matchName=true ajoute la clé nom+entreprise (utilisée par la prospection).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function findDuplicateContact(ctx: any, c: { phone?: string; email?: string; linkedinUrl?: string; fullName?: string; companyName?: string }, matchName = false): Promise<Id<"crm_contacts"> | null> {
  const ephone = digits(c.phone), eemail = norm(c.email), elink = norm(c.linkedinUrl)
  const ename = matchName ? norm(c.fullName) + "|" + norm(c.companyName) : ""
  if (!ephone && !eemail && !elink && !ename) return null
  const all = await ctx.db.query("crm_contacts").collect()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = all.find((x: any) =>
    (ephone && digits(x.phone) === ephone) ||
    (eemail && norm(x.email) === eemail) ||
    (elink && norm(x.linkedinUrl) === elink) ||
    (matchName && ename && (norm(`${x.firstName ?? ""} ${x.lastName ?? ""}`) + "|" + norm(x.companyName)) === ename))
  return m ? m._id : null
}
