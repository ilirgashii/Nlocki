import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { idlFactory } from '../src/frontend/src/declarations/backend.did.js';
const r = createRequire(new URL('../src/frontend/package.json', import.meta.url));
const { Actor, HttpAgent } = r('@icp-sdk/core/agent');
const { Ed25519KeyIdentity } = r('@icp-sdk/core/identity');
const id = process.env.NLOCKI_CANISTER_ID || execFileSync(process.env.NLOCKI_DFX || 'dfx', ['canister', 'id', 'backend'], {encoding:'utf8'}).trim();
async function actor(identity) { const agent = new HttpAgent({identity,host:process.env.NLOCKI_BACKEND_HOST || 'http://127.0.0.1:4943'}); await agent.fetchRootKey(); return Actor.createActor(idlFactory,{agent,canisterId:id}); }
function decode(value) { let bits=0,acc=0; const bytes=[]; for(const c of value) { acc=acc*32+'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);bits+=5;if(bits>=8){bits-=8;bytes.push((acc>>bits)&255);acc%=2**bits;} } return Buffer.from(bytes); }
function otp(secret) { const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha256',decode(secret)).update(counter).digest();const offset=h[h.length-1]&15;return String((h.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0'); }
const primary=Ed25519KeyIdentity.generate(), other=Ed25519KeyIdentity.generate();
const a=await actor(primary), b=await actor(other);
await a.createOrGetProfile(); await b.createOrGetProfile();
let secret, recovery, session, sessionActor;
await test('TOTP setup needs a valid code and proof of session-key possession',async()=>{
  const setup=await a.beginSecondFactorSetup();secret=setup.secret;
  const bad=await a.confirmSecondFactorSetup('invalid',other.getPrincipal());assert.ok('error' in bad);
  await assert.rejects(a.confirmSecondFactorSetup(otp(secret),other.getPrincipal()),/fresh session key/);
  session=Ed25519KeyIdentity.generate();sessionActor=await actor(session);await sessionActor.prepareSecondFactorSession();
  const result=await a.confirmSecondFactorSetup(otp(secret),session.getPrincipal());assert.ok('ok' in result);recovery=result.ok;
  assert.equal(recovery.length,4);assert.equal((await a.getSecondFactorStatus()).enabled,true);
});
await test('direct API calls from the primary key cannot bypass 2FA',async()=>{
  await assert.rejects(a.getMyProfile(),/Second factor required/);
  await assert.rejects(a.addTask('2026-01-01','Bypass'),/Second factor required/);
  assert.equal((await sessionActor.getMyProfile())[0].userId,primary.getPrincipal().toText());
  await sessionActor.addTask('2026-01-01','Protected task');
  assert.equal((await sessionActor.getTasksForDate('2026-01-01')).length,1);
  await assert.rejects(b.prepareSecondFactorSession(),/fresh session key/);
});
await test('recovery codes are one-use, revoke old sessions and are rate limited',async()=>{
  const fresh=Ed25519KeyIdentity.generate(), c=await actor(fresh);await c.prepareSecondFactorSession();
  assert.ok('ok' in await a.verifySecondFactor(recovery[0],fresh.getPrincipal()));
  await assert.rejects(sessionActor.getMyProfile(),/Sign in required|Second factor required|session/i);
  const next=Ed25519KeyIdentity.generate(), n=await actor(next);await n.prepareSecondFactorSession();
  assert.ok('error' in await a.verifySecondFactor(recovery[0],next.getPrincipal()));
  for(let i=0;i<4;i++) assert.ok('error' in await a.verifySecondFactor('invalid',next.getPrincipal()));
  const locked=await a.verifySecondFactor(recovery[1],next.getPrincipal());assert.ok('error' in locked);assert.match(locked.error,/five minutes/);
  await a.revokeSecondFactorSessions();
  await assert.rejects(c.getMyProfile(),/session|Second factor|Sign in/i);
});
