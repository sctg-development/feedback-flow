import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { config } from 'dotenv';

export default defineWorkersConfig({
	define: {
		'import.meta.env.AUTH0_DOMAIN': JSON.stringify(process.env.AUTH0_DOMAIN),
		'import.meta.env.AUTH0_CLIENT_ID': JSON.stringify(process.env.AUTH0_CLIENT_ID),
		'import.meta.env.AUTH0_AUDIENCE': JSON.stringify(process.env.AUTH0_AUDIENCE),
		'import.meta.env.AUTH0_SCOPE': JSON.stringify(process.env.AUTH0_SCOPE),
		'import.meta.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL),
		'import.meta.env.AUTH0_TOKEN': JSON.stringify(process.env.AUTH0_TOKEN),
	},
	test: {
		exclude: ['test/*.api.test.ts'],
		include: ['test/*.spec.ts'],
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
			},
		},
		env: {
            ...config({ path: "../.env" }).parsed,
        },
	},
});
