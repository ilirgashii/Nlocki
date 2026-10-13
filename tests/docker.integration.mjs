import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { idlFactory } from '../src/frontend/src/declarations/backend.did.js';
const container = process.env.NLOCKI_DOCKER_CONTAINER;
if (!container) throw new Error('Set NLOCKI_DOCKER_CONTAINER to your local development test container; this test restarts it.');
const requireFrontend = createRequire(new URL('../src/frontend/package.json', import.meta.url));
const { Actor, HttpAgent } = requireFrontend('@icp-sdk/core/agent');
const { Ed25519KeyIdentity } = requireFrontend('@icp-sdk/core/identity');
const id = execFileSync('docker', ['exec', container, 'dfx', 'canister', 'id', 'backend'], {encoding:'utf8'}).trim();
const identity = Ed25519KeyIdentity.generate();
async function connect() {
  const agent = new HttpAgent({identity,host:process.env.NLOCKI_BACKEND_HOST || 'http://127.0.0.1:4943'});
  await agent.fetchRootKey();
  return Actor.createActor(idlFactory,{agent,canisterId:id});
}
const date = '2020-01-03', title = `Docker restart ${Date.now()}`;
await (await connect()).addTask(date,title);
execFileSync('docker',['restart','--time','60',container],{timeout:90_000,stdio:'pipe'});
const deadline = Date.now()+180_000;
let ready = false;
while (Date.now()<deadline) {
  try {
    const response = await fetch(process.env.NLOCKI_BASE_URL || 'http://127.0.0.1:5173',{signal:AbortSignal.timeout(3000)});
    if (response.ok) { ready=true; break; }
  } catch { /* startup still in progress */ }
  await delay(1000);
}
assert.equal(ready,true,'Frontend must become ready after restart');
assert.equal(execFileSync('docker',['exec',container,'dfx','canister','id','backend'],{encoding:'utf8'}).trim(),id);
assert.equal((await (await connect()).getTasksForDate(date)).some(task=>task.title===title),true);
console.log('PASS: Docker frontend readiness, unchanged backend ID and signed user data preserved across container restart');
