<p align="center"><a href="https://fecusio.com" target="_blank"><img src="https://fecusio.com/logo.png" width="400"></a></p>

# @fecusio/core-js

A lightweight JavaScript/TypeScript SDK for Fecusio Core service.

## Installation

```bash
npm install @fecusio/core-js
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
- `defaultIdentities`: Array of identity IDs
- `baseURL`: Custom API endpoint (default: https://core.fecusio.com/v1/)
- `timeout`: Request timeout in ms (default: 5000)

### `evaluate(identities?, fresh?)`

Evaluates feature flags, returns an Evaluation object:
- `identities`: Optional array of user identities
- `fresh`: Force a fresh evaluation (bypass cache)

### `clearCache()`

Method to manage the evaluation cache.

## License

MIT
