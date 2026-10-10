import { copyFile, mkdir } from 'node:fs/promises';
const name = process.argv[2];
if (!['policy', 'evidence', 'report'].includes(name)) throw new Error('Choose policy, evidence, or report');
await mkdir('.backups', {recursive:true});
await copyFile(`learner/${name}.mjs`, `.backups/${name}-${Date.now()}.mjs`);
await copyFile(`checkpoints/${name}.mjs`, `learner/${name}.mjs`);
console.log(`Restored ${name}; your previous file is in .backups/. Restart the local server.`);
