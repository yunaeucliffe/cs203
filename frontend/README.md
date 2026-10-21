# SilverRoute frontend

React 19 + Vite app for SilverRoute. For database and backend setup, see the [root README](../README.md).

## Prerequisites

- Node.js 22 and npm (the version CI uses)
- The backend running on <http://localhost:8081> (needed to use the app, not to run tests). The URL is set in `src/api.js`.

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution blocks `npm.ps1`.

## Install

```sh
cd frontend
npm ci
```

## Run

```sh
npm run dev
```

Open <http://localhost:5173>. Sign in with the development account from the root README.

## Test

```sh
npm test         # unit tests in tests/ (Node's built-in test runner; network calls are stubbed)
npm run lint     # ESLint
npm run build    # production build into dist/
```

CI runs `npm ci`, `npm run lint` and `npm run build` on every pull request into `main`.
