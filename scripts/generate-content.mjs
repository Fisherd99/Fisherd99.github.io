import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { generateArticlesList } from './generate-articles-list.js'
import { generateNavConfig } from './generate-nav-config.js'
import { generateLlmsTxt } from './generate-llms-txt.js'

// Stop before generating article indexes if music resource generation fails.
const result = spawnSync(process.execPath, [fileURLToPath(new URL('generate-scores.js', import.meta.url))], {
  stdio: 'inherit'
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

const articles = generateArticlesList()
generateNavConfig(articles)
generateLlmsTxt(articles)
