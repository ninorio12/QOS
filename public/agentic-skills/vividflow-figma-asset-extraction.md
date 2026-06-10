---
name: vividflow-figma-asset-extraction
description: Use when extracting VividFlow typography, assets, logos, components, colors, frame specs, exports, or Dev Mode data from Figma, especially when browser access is blocked or tokens/exports are missing.
---

# VividFlow Figma Asset Extraction

## Core Principle

Do not recreate VividFlow assets from memory when Figma is the source of truth. First try to extract typography, components, logo, export settings and frame specs from Figma. If access is blocked, create a precise asset request instead of guessing.

## Access Order

1. Try browser on the Figma design/dev link.
2. If CloudFront 403 or authwall appears, try Figma REST API with the file key.
3. Check only whether a token exists, never print token values.
4. Before asking Jonathan for missing assets, recover everything available from local cache, Notion moodboards/resources, previous screenshots, and accessible image URLs.
   - For Notion-hosted images, try higher-quality URL variants such as `width=2048` when the original source supports it.
   - If a Canva link is provided, test it, but treat Cloudflare/security challenges as a hard browser block and do not wait on it.
   - Run visual analysis on the best recovered references to extract usable style rules before declaring the task blocked.
5. If no token or API returns `Invalid token`, request one of:
   - Figma file access for the agent account/browser.
   - A Figma personal access token with read-only file access.
   - Exported PNG/PDF frames at 2x.
   - Exported SVG logo/assets.
   - Screenshot pack of Dev Mode right panel showing typography, colors, spacing.
   - Copy-pasted typography styles and component specs.

6. When a user points to previously shared Figma exports/images by date or context, search session transcripts and cache/document paths before asking for the files again. Useful search terms for VividFlow source recovery include `Samedi.png`, `Jonathan Zekhe - LinkedIn Post`, `Logo.svg`, `Profil Button.svg`, and `vividflow-figma-linkedpost-source`.

Detailed blocked-Figma recovery sequence: `references/figma-blocked-recovery-playbook.md`.
Session-specific max-recovery example: `references/session-asset-recovery-max-potential.md`.
Soren/logo provenance correction example: `references/session-soren-logo-recovery-2026-05-15.md`.

## File Key Extraction

From a Figma URL like:
`https://www.figma.com/design/FILE_KEY/...`
extract `FILE_KEY` and use:
`GET https://api.figma.com/v1/files/FILE_KEY`
with header:
`X-Figma-Token: [REDACTED]`

## What To Extract

- Font families, weights, sizes, line heights, letter spacing.
- Text styles: H1, H2, micro-labels, capsules, body, CTA.
- Color tokens: black, orange, grey, white, gradients, opacity values.
- Logo files: SVG preferred, PNG fallback.
- Brand pill component: dimensions, radius, blur, stroke, icon, baseline.
- Navigation chevron component.
- Background assets: glows, rays, textures, grids, UI screenshots.
- Frame sizes and export settings.
- Component variants and repeated slide templates.

## Asset Manifest Format

Create `/Users/businessmanagement/.hermes/cache/vividflow-figma-asset-manifest.md` with:

- Access status.
- Source URL/file key.
- Typography table.
- Color tokens.
- Component inventory.
- Exported asset paths.
- Missing assets.
- Impact on next creative iteration.

## Hard Rules

- Do not invent typography if Figma is requested.
- Do not invent, redraw, or approximate VividFlow/Soren logos. A recreated mark is a placeholder even if it looks clean.
- For logo/charte work, audit all candidate assets before production: current repo/public assets, old QORPO assets, generated SVGs, screenshots, session transcripts, topic references, and Figma/Canva exports when accessible.
- Clearly classify each candidate as `official`, `legacy/other brand`, or `placeholder/recreated`. If the official asset is missing, say so and deliver either a precise request or a clearly labeled placeholder draft.
- Do not claim assets were recovered if Figma/API was blocked.
- Do not expose tokens in files, memory, chat, or screenshots.
- If blocked, convert the block into a precise request for Jonathan.

## Current Known Block

The VividFlow Figma link can return CloudFront 403 in the agent browser. The Figma API returns `Invalid token` without a read token. In that case, proceed via requested exports or token, not guessing.
