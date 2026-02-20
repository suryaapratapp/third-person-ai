import { closeWorker, parseExportWorker } from './services/parseExportWorker'
import {
  aggregatePersonalityWorker,
  closeAggregatePersonalityWorker,
} from './services/aggregatePersonalityWorker'
import { closeRunAnalysisWorker, runAnalysisWorker } from './services/runAnalysisWorker'
import { env } from './utils/env'
import { pool } from './utils/db'

console.log(
  `[worker] listening on queues ${env.parseExportQueueName}, ${env.analysisQueueName}, and ${env.aggregatePersonalityQueueName}`,
)

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down...`)
  await closeWorker()
  await closeRunAnalysisWorker()
  await closeAggregatePersonalityWorker()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

void parseExportWorker.waitUntilReady()
void runAnalysisWorker.waitUntilReady()
void aggregatePersonalityWorker.waitUntilReady()
