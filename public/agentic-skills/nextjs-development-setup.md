---
name: nextjs-development-setup
category: software-development
description: Setup and troubleshooting for Next.js applications with src directory structure
version: 1.0.0
---

# Next.js Development Setup & Troubleshooting

## Overview
Comprehensive setup and troubleshooting guide for Next.js applications, particularly with src directory structure and common development issues.

## Prerequisites
- Node.js installed
- npm or yarn package manager
- TypeScript support (optional but recommended)

## Quick Start

### Standard Setup
```bash
# Create Next.js app with TypeScript
npx create-next-app@latest app-name --typescript

# Or with src directory
npx create-next-app@latest app-name --typescript --src-dir
```

### For Existing Projects
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Directory Structure Issues

### Problem: Next.js Can't Find App Directory
**Error**: `> Couldn't find any 'pages' or 'app' directory. Please create one under the project root`

**Solution 1**: Create symlink for src directory
```bash
# If src/app exists but Next.js can't find it
rm -rf app  # Remove existing app directory if needed
ln -s src/app app  # Create symbolic link
```

**Solution 2**: Use absolute path in config
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // App directory configuration handled by symlink
};
```

### Common Directory Structures

#### With src Directory
```
project-root/
├── src/
│   ├── app/          # App router directory
│   ├── components/   # Reusable components
│   └── hooks/        # Custom hooks
├── public/          # Static assets
├── next.config.ts   # Next.js configuration
└── package.json      # Dependencies
```

#### Standard Next.js Structure
```
project-root/
├── app/            # App router directory (no src)
├── components/     # Reusable components
├── public/         # Static assets
└── next.config.ts  # Next.js configuration
```

## Development Server Issues

### Port Conflicts
```bash
# Use different port
npx next dev --port 3001

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

### Live self-hosted port migrations with existing user links
When a self-hosted Next.js app is moved from one exposed port to another, first reproduce both URLs from outside and check listeners/PM2 before touching app code:

```bash
for p in 3000 3003; do curl -4 -sS -I --max-time 8 http://HOST:$p/path; done
ss -ltnp | grep -E ':(3000|3003)\\b' || true
pm2 list
pm2 logs APP --lines 80 --nostream
```

If the app is healthy on the new port but users still have old links, add a tiny PM2 compatibility proxy from old port → new port instead of running a second Next dev server. Save PM2 after verification. Keep the main app on one canonical port and browser-verify both URLs. See `references/self-hosted-port-compatibility-proxy.md` for a reusable proxy template and smoke commands.

### Build Errors
```bash
# Clean build
rm -rf .next
npm run build

# Force install
rm -rf node_modules package-lock.json
npm install
```

### Self-hosted PM2 builds with missing or partial env
If `next build` fails during `Collecting page data` / prerender with SDK errors such as `supabaseUrl is required` or a missing AI provider key, inspect top-level route/page imports before adding dummy secrets. In App Router, module-scope provider constructors run during build. Move external clients behind request-time helpers and use safe Supabase fallback clients for dev/frontend rendering. See `references/self-hosted-nextjs-pm2-empty-env.md` for the PM2 config, deploy script, fallback pattern, and verification commands.

### Vercel-linked Next.js apps with env vars
For projects linked to Vercel, `vercel env pull .env.local --environment=preview` can create a local `.env.local` that contains only Vercel system variables when Preview/Development env vars are empty. If build fails with a missing public backend URL such as `Client created with undefined deployment address`, inspect env *names only* and pull/source the correct Vercel environment without printing secret values:

```bash
vercel link --yes --project <project-name>
vercel env ls production
vercel env ls preview
vercel pull --yes --environment=production
set -a
. .vercel/.env.production.local
set +a
npm run build
```

Do not commit `.vercel/` or `.env*.local`; restore any `.gitignore` mutation made by `vercel env pull` unless the user explicitly wants the repo changed.

### Protected App Router pages during local visual audit
If a protected route still redirects after middleware/proxy is disabled, inspect `app/(group)/layout.tsx` or nested server components for auth guards using `redirect('/login')`. For screenshot-only audits, a temporary local mock user in the protected layout can unblock visual inspection, but isolate/revert it before committing and label screenshots as auth-bypassed.

### Browser verification when `next dev` HMR is noisy
If Playwright/browser smoke tests in `next dev` show repeated `/_next/webpack-hmr` WebSocket errors or flaky hydration/click behavior while tests/typecheck/build pass, do not conclude the app is broken from dev-server evidence alone. Build and verify the production server with `npm run build` then `npm run start -- -p <port>`, and run browser/API smoke tests against that server. Treat production runtime console errors and failed persisted mutations as real failures; treat dev HMR noise as a verification artifact unless reproduced in production. See `references/nextjs-prod-smoke-browser-verification.md` for the exact pattern.

### Background `Ready in` is not enough
When a background Next dev process matches a watch pattern like `Ready in`, do not treat that as durable proof the local server is still available. Immediately poll the process, inspect the listener, and smoke the target URL:

```bash
# Replace <proc_id> with the background process id when using Hermes process tools.
ss -ltnp | grep ':3130' || true
curl -sS -I --max-time 10 'http://127.0.0.1:3130/' | sed -n '1,20p'
ps -eo pid,ppid,etime,cmd | grep -E 'next (dev|build|start)|npm run (dev|build)' | grep -v grep || true
```

If the process exited with `-15` after `Ready in`, report that it was killed/stopped and relaunch only after checking for concurrent `next build`/`next dev` processes that could corrupt `.next`.

## Troubleshooting Checklist

1. **Check package.json**: Ensure Next.js and dependencies are installed
2. **Verify directory structure**: Confirm app/ or src/app exists
3. **Check next.config.ts**: No invalid experimental flags
4. **Clean build artifacts**: Remove .next directory
5. **Restart dev server**: Kill existing process and restart

## Environment Setup

### Development Environment Variables
```bash
# Create .env.local for development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=your_database_url
```

### TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

## Common Pitfalls

### Pitfall: Symbolic Link Issues
- **Problem**: Symlinks can break on different filesystems
- **Solution**: Use absolute paths or copy directory instead

### Pitfall: Next.js Version Conflicts
- **Problem**: Different Next.js versions have different app directory support
- **Solution**: Use consistent Next.js version and check compatibility

### Pitfall: Missing Dependencies
- **Problem**: Missing peer dependencies or dev dependencies
- **Solution**: Run `npm install` after adding new dependencies

## References

For more detailed information:
- [Next.js Documentation](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app/building-your-application/routing)
- [TypeScript with Next.js](https://nextjs.org/docs/basic-features/typescript)

## Scripts

### Quick Setup Script
```bash
#!/bin/bash
# scripts/quick-setup.sh
echo "Setting up Next.js development environment..."
npm install
npm run dev
```

### Clean Build Script
```bash
#!/bin/bash
# scripts/clean-build.sh
echo "Cleaning and rebuilding..."
rm -rf .next node_modules/.cache
npm install
npm run build
```

### Troubleshooting Script
```bash
#!/bin/bash
# scripts/troubleshoot-directory.sh
echo "🔍 Next.js Directory Structure Troubleshooting..."
# Runs comprehensive checks for directory issues and suggests fixes
```

## Support Files

### References
- **references/troubleshooting-session-notes.md** - Specific session notes with detailed troubleshooting steps and error patterns encountered
- **references/vercel-env-local-build.md** - Vercel-linked Next.js local build failures caused by missing env vars, with safe env-name inspection and production env sourcing pattern
- **references/nextjs-prod-smoke-browser-verification.md** - Production-server browser smoke pattern for separating `next dev` HMR noise from real hydration/runtime failures
- **references/troubleshooting-directory-structure.md** - General directory structure troubleshooting guide

### Scripts
- **scripts/troubleshoot-directory.sh** - Automated troubleshooting script that checks common issues and suggests fixes