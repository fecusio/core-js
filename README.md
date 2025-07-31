# @fecusio/core

A lightweight JavaScript/TypeScript SDK for Fecusio Core service.

## Installation

```bash
npm install @fecusio/core
```

## Usage

```typescript
import { FecusioCore } from '@fecusio/core';

// Initialize the client
const fecusio = new FecusioCore({
  environmentKey: 'your-environment-key'
});

// Basic usage
const evaluation = await fecusio.evaluate();

if (evaluation.isFeatureEnabled('my_feature')) {
    // Feature is enabled
} else {
    // Feature is disabled
}
```

## API

### `new FecusioCore(options)`

Options:
- `environmentKey` (required): Your Fecusio environment key
- `defaultFlags`: Fallback flags when API is unavailable
- `defaultIdentitiesContext`: Array of identity IDs
- `baseURL`: Custom API endpoint (default: https://core.fecusio.com/v1/)
- `timeout`: Request timeout in ms (default: 5000)

### `evaluate(identitiesContext?, fresh?)`

Evaluates feature flags, returns an Evaluation object:
- `identitiesContext`: Optional array of user identities
- `fresh`: Force a fresh evaluation (bypass cache)

### `clearCache()` and `getCacheSize()`

Methods to manage the evaluation cache.

## License

MIT
