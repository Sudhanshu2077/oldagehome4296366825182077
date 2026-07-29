import { connectMongo, disconnectMongo } from '../src/services/mongo.service.js';
import { runRbacSeed } from './run-rbac-seed.js';
import { getLogger } from '../src/config/logger.js';

async function main(): Promise<void> {
  await connectMongo();
  await runRbacSeed();
  await disconnectMongo();
}

main().catch((err) => {
  getLogger().error({ err }, 'seed failed');
  process.exit(1);
});
