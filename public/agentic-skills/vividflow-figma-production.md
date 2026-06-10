---
name: vividflow-figma-production
description: Use when preparing VividFlow carousel production in Figma, exports, templates, component systems, or handoff to designers and collaborators
---

# VividFlow Figma Production

## Core Principle

Figma is the production surface for final VividFlow social assets. HTML/browser mockups are prototypes only unless Jonathan explicitly asks for a technical preview.

## Current Access Constraint

Agent browser access to Figma may be blocked by CloudFront 403. If direct access fails, use `vividflow-figma-asset-extraction` and request one of:
- Read-only Figma token for file API extraction.
- PNG/PDF export of the relevant frame.
- Screenshot pack including Dev Mode right panel.
- Public duplicate file.
- SVG logo/component exports.
- Exported `.fig` if usable by the current environment.
- Manual copy of frame specs.

## Required Production Inputs

Before creating or editing a Figma-ready carousel:
- Final slide script.
- Approved visual direction.
- Reference template or benchmark.
- Format dimensions.
- Logo/assets.
- CTA destination.

## Figma Template System

Build or request templates for:
- Cover slide.
- Problem slide.
- Cost slide.
- Mechanism slide.
- Before/after workflow slide.
- CTA slide.

Each template should define:
- Text zones.
- Logo position.
- CTA position.
- UI component library.
- Orange accent behavior.
- Export naming convention.

## Handoff Checklist

For every final-ready asset:
- Frames named by slide number.
- Text editable.
- Components reusable.
- No rasterized text unless intentional.
- Exported in required platform format.
- Version stored with date, problem, angle, channel.

## Common Mistakes

- Treating a browser mockup as a final creative asset.
- Starting Figma before the script is approved.
- Recreating the DA from memory instead of using components.
- Exporting without QA and naming discipline.
