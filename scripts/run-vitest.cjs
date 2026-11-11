const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const vitestEntry = path.resolve(__dirname, '../node_modules/vitest/vitest.mjs')
const nodeBinding = path.resolve(__dirname, '../.cache/node-v127/build/Release/better_sqlite3.node')
const env = { ...process.env }

if (fs.existsSync(nodeBinding) && process.versions.modules !== '121') {
  env.BETTER_SQLITE3_BINDING = nodeBinding
}

const res = spawnSync(process.execPath, [vitestEntry, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
})

process.exit(res.status ?? 1)
