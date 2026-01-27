#!/usr/bin/env node
import { build } from './index.js';

build().catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
});
