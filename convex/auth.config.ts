export default {
  providers: [
    {
      // Domaine Clerk (issuer du JWT). Le template JWT Clerk doit s'appeler "convex".
      // Instance Production (issuer encodé dans pk_live = clerk.vividflow.co).
      domain: "https://clerk.vividflow.co",
      applicationID: "convex",
    },
  ],
}
