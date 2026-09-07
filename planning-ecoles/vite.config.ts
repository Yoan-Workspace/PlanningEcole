import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { devApiPlugin } from './vite-plugin-dev-api.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ACCESS_CODE) process.env.ACCESS_CODE = env.ACCESS_CODE
  if (env.SESSION_SECRET) process.env.SESSION_SECRET = env.SESSION_SECRET

  return {
    plugins: [react(), devApiPlugin()],
  }
})
