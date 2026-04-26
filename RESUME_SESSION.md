# Résumé session — À coller en début de nouvelle conversation

## Contexte actuel
On configure le workflow n8n pour connecter **ElevenLabs Conversational AI** (agent réceptionniste vocal) avec **Google Calendar** pour checker les dispo et booker des RDV.

## Ce qui est déjà fait
- Workflow n8n créé et importé : `C:\Users\thoma\qos\workflows\elevenlabs-google-calendar.json`
- Workflow visible dans n8n (`http://116.203.237.156:5678`) avec 16 nœuds
- MCP n8n ajouté à Claude Code (`claude mcp add n8n`) → nécessite restart Claude Code pour être actif
- Config MCP dans `C:\Users\thoma\.claude.json` (projet qos)
  - N8N_API_URL : `http://116.203.237.156:5678/api/v1`
  - N8N_API_KEY : déjà configurée

## Ce qui reste à faire
1. **Redémarrer Claude Code** pour charger le MCP n8n
2. **Configurer credential Google Calendar dans n8n** via MCP ou UI :
   - Client ID : `806602326642-16qmdtc9qgol1si8io3kstllg2p39kp5.apps.googleusercontent.com`
   - Client Secret : `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`
   - Ajouter redirect URI dans Google Cloud Console : `http://116.203.237.156:5678/rest/oauth2-credential/callback`
3. **Lier les nœuds Google Calendar** du workflow au credential créé
4. **Ajouter variable d'env OpenAI** dans n8n (Settings → Variables → `OPENAI_API_KEY`)
5. **Activer le workflow** (toggle Active)
6. **Récupérer l'URL du webhook** et la configurer dans ElevenLabs (3 tools : `check_availability`, `check_next_slots`, `create_event`)

## Architecture du workflow n8n
```
Webhook → Switch (tool_name)
  ├── check_availability → OpenAI (parse date FR→ISO) → Parse → Merge
  ├── check_next_slots   → OpenAI (parse plage FR→ISO) → Parse → Merge
  └── create_event       → Code (parse params) → Respond to Webhook
                                                           ↑
Merge → GCal (get events) → Code (aggregate) → IF (disponible?)
  ├── OUI → Message "disponible" → Respond to Webhook
  └── NON → Message "indisponible" → Respond to Webhook
```

## Stack infra
- VPS Hetzner : `116.203.237.156`
- n8n : Docker port 5678
- App Soren : `http://localhost:4000` (Next.js port 4000)
- Supabase projet : `ihtdazabodmkiapokgtd`

## Fichiers modifiés cette session (devis PDF)
- `src/components/devis/DevisTemplateStatic.tsx` — source de vérité React (font 22px)
- `src/components/devis/DevisTemplate.tsx` — wrapper client
- `src/components/devis/DevisDetailView.tsx` — download via browser print
- `src/lib/devisHtmlBuilder.ts` — miroir HTML string (PDF + send)
- `src/app/api/devis/[id]/pdf/route.ts` — route PDF serveur
- `src/app/api/devis/[id]/send/route.ts` — route envoi GHL
