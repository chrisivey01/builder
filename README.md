# @pma/build

A build tool for FiveM/RedM resources with watch mode and auto-restart support.

## Features

- 🔄 Auto-restart resources on file changes
- 🎮 Support for both FiveM and RedM
- 📦 Built-in TypeScript/JavaScript bundling with esbuild
- 🌐 Web UI dev server integration
- ⚡ Fast rebuilds with watch mode
- 🎯 Automatic fxmanifest.lua updates

## Installation

```bash
pnpm add -D @pma/build
# or
npm install --save-dev @pma/build
# or
yarn add -D @pma/build
```

## Usage

### Command Line

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "build": "pma-build",
    "watch": "pma-build --watch",
    "build:redm": "pma-build --redm",
    "watch:redm": "pma-build --watch --redm"
  }
}
```

Then run:

```bash
pnpm build        # Build for FiveM
pnpm watch        # Watch mode for FiveM
pnpm build:redm   # Build for RedM
pnpm watch:redm   # Watch mode for RedM
```

### Programmatic API

```javascript
import { build } from '@pma/build';

await build({
  resourceName: 'my-resource',
  restartEndpoint: 'http://127.0.0.1:4689/rr',
  restartTimeout: 2000,
  debounceDelay: 500,
  webDevPort: 5173,
  builds: {
    client: { platform: 'browser', target: 'es2021', format: 'iife' },
    server: { platform: 'node', target: 'node16', format: 'cjs' }
  }
});
```

## Configuration

Create a `build.config.js` in your project root:

```javascript
export default {
  restartEndpoint: 'http://127.0.0.1:4689/rr',
  restartTimeout: 2000,
  debounceDelay: 500,
  webDevPort: 5173,
  builds: {
    client: { platform: 'browser', target: 'es2021', format: 'iife' },
    server: { platform: 'node', target: 'node16', format: 'cjs' }
  }
};
```

## GAME Constant

The build tool automatically injects a `GAME` constant into your code:

```typescript
// Available globally in your code
if (GAME === 'REDM') {
  console.log('Running on RedM');
} else {
  console.log('Running on FiveM');
}
```

Add this to your `types/game.d.ts`:

```typescript
declare global {
  const GAME: "REDM" | "FIVEM";
}

export {};
```

## License

MIT
