import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../src/simulation.js',import.meta.url),'utf8');
const {Simulation,impactEnergy,SCENARIOS}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('kinetic energy scales with diameter cubed and velocity squared',()=>{
 const e=impactEnergy({diameter:100,velocity:20});assert.equal(impactEnergy({diameter:200,velocity:20})/e,8);assert.equal(impactEnergy({diameter:100,velocity:40})/e,4);
});
test('impact location, scale and ocean exposure change consequences',()=>{
 const a=new Simulation(),b=new Simulation(),c=new Simulation();
 const small=a.execute('asteroid',23,78,{diameter:100});const large=b.execute('asteroid',23,78,{diameter:5000});const remote=c.execute('asteroid',-85,-150,{diameter:100});
 assert.ok(large.casualties>small.casualties);assert.ok(small.casualties>remote.casualties);assert.ok(large.radiusKm>small.radiusKm);assert.ok(large.severity<=1);
});
test('time progression is deterministic, zero days pauses, and restoration never resurrects',()=>{
 const a=new Simulation();a.execute('asteroid',23,78,{diameter:4000});const b=new Simulation();b.load(a.serialize());
 const paused=a.serialize();a.step(0);assert.equal(a.serialize(),paused);
 a.step(100);for(let i=0;i<100;i++)b.step(1);assert.equal(a.state.population,b.state.population);assert.equal(a.state.food,b.state.food);
 const pop=a.state.population,loss=a.state.casualties,forest=a.state.forest;a.execute('reforest',23,78);assert.equal(a.state.population,pop);assert.equal(a.state.casualties,loss);a.step(100);b.step(100);assert.ok(a.state.population<=b.state.population*1.001);assert.ok(a.state.casualties>=loss);assert.ok(a.state.forest>forest);
});
test('all actions and scenarios remain finite, bounded and serializable',()=>{
 const actions=['asteroid','earthquake','volcano','supervolcano','tsunami','hurricane','wildfire','flood','drought','warming','iceage','pandemic','reforest','ecosystem','cleanup','biodiversity','pollution','climate','freshwater','agriculture','rebuild','aid','defense'];
 for(const scenario of SCENARIOS){const s=new Simulation(scenario);for(const type of actions)s.execute(type,20,80);s.step(1000);
 assert.ok(s.state.population>=0);assert.ok(Math.abs(s.state.population+s.state.casualties+s.state.naturalDeaths-s.state.births-s.state.initialPopulation)<1);
 for(const key of ['forest','water','food','biodiversity','ocean','dust','infrastructure','healthcare','preparedness'])assert.ok(s.state[key]>=0&&s.state[key]<=100,`${scenario} ${key}`);
 const loaded=new Simulation();loaded.load(s.serialize());assert.equal(loaded.state.population,s.state.population);
 }
});
test('invalid saves and commands are rejected without mutation',()=>{
 const s=new Simulation(),before=s.serialize();assert.throws(()=>s.load('{'));assert.throws(()=>s.execute('unknown',0,0));assert.throws(()=>s.execute('asteroid',NaN,0));assert.throws(()=>s.step(Infinity));
 const bad=JSON.parse(before);bad.state.regions[0].population=-1;assert.throws(()=>s.load(bad));assert.equal(s.serialize(),before);
 const corrupt=JSON.parse(before);corrupt.state.population+=100;assert.throws(()=>s.load(corrupt));assert.equal(s.serialize(),before);
});
test('repeated severe impacts cannot produce negative population',()=>{
 const s=new Simulation();for(let i=0;i<180;i++)s.execute('asteroid',23,78,{diameter:50000});s.step(3650);assert.ok(s.state.population>=0);assert.ok(s.state.events.length<=160);assert.ok(s.state.history.length<=240);new Simulation().load(s.serialize());
});
test('birth and natural death ledgers explain growth; migration conserves population',()=>{
 const s=new Simulation(),initial=s.state.population;s.step(365);
 assert.ok(s.state.births>0);assert.ok(s.state.naturalDeaths>0);assert.ok(s.state.population>initial);assert.ok(s.state.migrated>0);
 const incoming=s.state.regions.reduce((n,r)=>n+r.migrationIn,0),outgoing=s.state.regions.reduce((n,r)=>n+r.migrationOut,0);
 assert.ok(Math.abs(incoming-outgoing)<.001);assert.ok(Math.abs(s.state.population-initial-s.state.births+s.state.naturalDeaths+s.state.casualties)<1);
 new Simulation().load(s.serialize());
 const corrupt=JSON.parse(s.serialize());corrupt.state.births+=10;assert.throws(()=>new Simulation().load(corrupt));
});
test('old v1 saves gain zero demographic ledgers without changing population',()=>{
 const s=new Simulation();s.execute('earthquake',23,78);const old=JSON.parse(s.serialize());for(const key of ['births','naturalDeaths','migrated'])delete old.state[key];for(const r of old.state.regions)for(const key of ['births','naturalDeaths','migrationIn','migrationOut'])delete r[key];
 const loaded=new Simulation();loaded.load(old);assert.equal(loaded.state.population,s.state.population);assert.equal(loaded.state.births,0);loaded.step(10);assert.ok(loaded.state.births>0);
});
