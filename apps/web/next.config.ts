import { resolve } from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// One .env at the repo root serves the web app and the CLI. Next runs from apps/web.
loadEnvConfig(resolve(process.cwd(), '../..'));

const config: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ['@casework/core', '@casework/tracks', '@casework/agents'],
  reactStrictMode: true,
  // Colleagues use the dev server through the tunnel; the floating dev badge covers the portal's call bar on phones.
  devIndicators: false,
  // `next dev` serves its scripts only to localhost unless told otherwise: let colleagues use the app
  // through the tunnel (pnpm tunnel / pnpm tunnel:ngrok).
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok-free.dev', '*.ngrok.app', '*.ngrok.dev', '*.trycloudflare.com'],
  // Don't generate AGENTS.md: the repo keeps no text aimed at AI models outside CLAUDE.md.
  agentRules: false,
};

export default config;
