// SPDX-License-Identifier: Apache-2.0
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createCiServer } from './server.mjs';

// The SDK owns stdin/stdout and lifecycle. No env files or operator credentials are read.
serveStdio(() => createCiServer());
