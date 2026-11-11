// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://petermart.github.io',
  base: '/fire-calculator',
  integrations: [react()],
  server: { port: 4321 },
});
