# Contributing to Clipper

Thank you for your interest in contributing to Clipper!

## Development Setup

### Prerequisites
- Windows 10 or Windows 11
- Node.js 20+
- `pnpm`

### Install & Run
```powershell
pnpm install
pnpm dev
```

## Verification Checks

Before opening a pull request, please make sure all checks pass:

```powershell
# TypeScript type-check
npx tsc --noEmit

# Linter
npx eslint .

# Unit & component tests (Vitest)
pnpm test

# Production bundle build
pnpm build

# End-to-end Electron tests (Playwright)
pnpm test:e2e
```

## Guidelines
- Keep Electron main-process changes typed without `any` (`@typescript-eslint/no-explicit-any` is enforced).
- Add or update tests in `electron/__tests__/`, `src/__tests__/`, or `e2e/` when changing behavior.
- Keep pull requests focused on a single feature or fix.
