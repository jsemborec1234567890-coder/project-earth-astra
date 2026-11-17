// Deliberately approximate sandbox model: regional centroids, not a population raster.
const clamp = (x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const finite = (value, fallback, lo, hi) => Number.isFinite(Number(value)) ? clamp(Number(value), lo, hi) : fallback;
const rad = Math.PI / 180;
const BASE = [
  ['North America', 40, -100, 610, 82, .55], ['South America', -16, -60, 440, 66, .45],
  ['Europe', 50, 16, 740, 87, .42], ['North Africa', 27, 18, 260, 58, .5],
  ['Sub-Saharan Africa', -4, 22, 1190, 42, .35], ['Middle East', 29, 47, 310, 67, .5],
  ['South Asia', 23, 78, 2010, 54, .5], ['East Asia', 35, 112, 1640, 80, .65],
  ['Southeast Asia', 7, 112, 700, 61, .85], ['Oceania', -25, 135, 50, 85, .9],
  ['Northern Eurasia', 61, 85, 140, 72, .15], ['Central Asia', 43, 65, 110, 58, .1],
];
export const SCENARIOS = ['Normal Earth', 'Climate Crisis', 'Post-Asteroid Recovery', 'Environmental Utopia', 'Civilization Collapse'];
const interventions = new Set(['reforest','ecosystem','cleanup','biodiversity','pollution','climate','freshwater','agriculture','rebuild','aid','defense']);
const disasters = new Set(['asteroid','earthquake','volcano','supervolcano','tsunami','hurricane','wildfire','flood','drought','warming','iceage','pandemic']);
const distance = (a,b,c,d) => 6371 * Math.acos(clamp(Math.sin(a*rad)*Math.sin(c*rad)+Math.cos(a*rad)*Math.cos(c*rad)*Math.cos((b-d)*rad), -1, 1));
export function impactEnergy(params = {}) {
  const d = finite(params.diameter, 500, 1, 50000), rho = finite(params.density, 3000, 100, 20000), v = finite(params.velocity, 20, 1, 100) * 1000;
  return .5 * (Math.PI/6) * d**3 * rho * v**2;
}
export class Simulation {
  constructor(scenario = 'Normal Earth') { this.restore(scenario); }
  restore(scenario = 'Normal Earth') {
    if (!SCENARIOS.includes(scenario)) scenario = 'Normal Earth';
    this.state = {version:1, scenario, day:0, population:0, initialPopulation:0, casualties:0, births:0, naturalDeaths:0, migrated:0, temp:1.2, co2:425, dust:0,
      forest:68, water:80, food:85, biodiversity:72, ocean:77, infrastructure:75, healthcare:70, preparedness:45,
      events:[], history:[], nextId:1, regions:BASE.map(([name,lat,lon,pop,infra,coastal],id)=>({id,name,lat,lon,population:pop*1e6,initialPopulation:pop*1e6,infrastructure:infra,healthcare:infra*.9,preparedness:45,coastal,casualties:0,births:0,naturalDeaths:0,migrationIn:0,migrationOut:0}))};
    const s=this.state;
    s.initialPopulation=s.regions.reduce((sum,r)=>sum+r.population,0);
    if(scenario==='Climate Crisis') Object.assign(s,{temp:3.4,co2:620,forest:43,water:54,food:63,biodiversity:44,ocean:51});
    if(scenario==='Environmental Utopia') { Object.assign(s,{temp:.4,co2:330,forest:94,water:98,food:98,biodiversity:96,ocean:96}); s.regions.forEach(r=>Object.assign(r,{infrastructure:97,healthcare:98,preparedness:92})); }
    if(scenario==='Civilization Collapse') { Object.assign(s,{temp:2.8,forest:38,water:35,food:28,biodiversity:35,ocean:42}); s.regions.forEach(r=>{this.kill(r,r.population*.68); r.infrastructure=18;r.healthcare=16;r.preparedness=14;}); }
    this.aggregate();
    if(scenario==='Post-Asteroid Recovery') {this.execute('asteroid',23,-88,{diameter:4200,velocity:22,density:3000,angle:45}); this.step(180); s.day=0; s.events.forEach(e=>e.day=-180); s.history=[];}
    this.record(); return s;
  }
  kill(region, count) { const n=clamp(count,0,region.population); region.population-=n; region.casualties+=n; this.state.casualties+=n; return n; }
  aggregate() {
    const s=this.state; s.population=s.regions.reduce((v,r)=>v+r.population,0);s.casualties=s.regions.reduce((v,r)=>v+r.casualties,0);
    for(const key of ['births','naturalDeaths'])s[key]=s.regions.reduce((v,r)=>v+r[key],0);
    s.migrated=s.regions.reduce((v,r)=>v+r.migrationOut,0);
    for(const key of ['infrastructure','healthcare','preparedness']) s[key]=s.regions.reduce((v,r)=>v+r[key]*r.initialPopulation,0)/s.initialPopulation;
    for(const key of ['forest','water','food','biodiversity','ocean','dust']) s[key]=clamp(s[key]);
    s.co2=clamp(s.co2,180,3000);s.temp=clamp(s.temp,-20,30);
  }
  record() {const s=this.state; s.history.push({day:s.day,population:s.population,temp:s.temp,forest:s.forest,food:s.food,biodiversity:s.biodiversity,births:s.births,naturalDeaths:s.naturalDeaths,casualties:s.casualties,migrated:s.migrated}); if(s.history.length>240)s.history.shift();}
  execute(type,lat,lon,params={}) {
    if(!interventions.has(type)&&!disasters.has(type)) throw new Error('Unknown intervention');
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180) throw new Error('Invalid geographic coordinates');
    const s=this.state, good=interventions.has(type), energy=type==='asteroid'?impactEnergy(params):0;
    let severity=finite(params.intensity??params.severity,50,1,100)/100, radius=900,duration=60;
    if(type==='asteroid') { severity=clamp(Math.log10(1+energy/4.184e15)/7,.005,1);radius=clamp(18*Math.pow(energy/4.184e15,.3),15,15000);duration=clamp(30+severity*1800,30,1830); }
    if(type==='earthquake') {severity=clamp((finite(params.magnitude,7.5,3,10)-3)/7,.01,1);radius=100+severity*900;duration=45;}
    if(type==='supervolcano') {radius=4200;duration=1500;severity=Math.max(.7,severity);}
    if(type==='pandemic') {radius=20000;duration=720;}
    if(['warming','iceage'].includes(type)){radius=20000;duration=3650;}
    if(type==='drought'){radius=2300;duration=540;}
    if(type==='tsunami'){radius=3500;duration=20;}
    if(type==='hurricane'){radius=850;duration=18;}
    if(good){radius=2300;duration=365;}
    const radiusKm=type==='asteroid'?.45*Math.pow(energy/1e15,.28)*Math.pow(Math.sin(finite(params.angle,45,5,90)*rad),.2):radius;
    const event={id:s.nextId++,type,lat,lon,day:s.day,params:JSON.parse(JSON.stringify(params)),energy,radiusKm,ocean:!!params.ocean,casualties:0,affectedPopulation:0,duration,age:0,severity,radius,restoration:good,status:'active',effects:{},targets:[]};
    const mortality={asteroid:.55,earthquake:.045,volcano:.06,supervolcano:.12,tsunami:.08,hurricane:.012,wildfire:.008,flood:.012,drought:.001,warming:0,iceage:0,pandemic:0};
    for(const r of s.regions){
      const d=distance(lat,lon,r.lat,r.lon);
      // Regional centroids represent distributed populations. A 650 km kernel avoids all-or-nothing targeting.
      let exposure=Math.exp(-d*d/(2*(radius+650)**2))*Math.min(1,(radius/900)**2);
      if(type==='tsunami'||(type==='asteroid'&&params.ocean))exposure*=r.coastal;
      event.targets.push({id:r.id,exposure});event.affectedPopulation+=r.population*exposure;
      if(!good){const protection=1-r.preparedness*.006; event.casualties+=this.kill(r,r.population*exposure*severity*(mortality[type]||0)*protection);const previous=r.infrastructure;r.infrastructure=clamp(r.infrastructure-exposure*severity*65);r.healthcare=clamp(r.healthcare-exposure*severity*35);event.targets.at(-1).infrastructureLoss=previous-r.infrastructure;event.effects.infrastructure=(event.effects.infrastructure||0)-(previous-r.infrastructure)*r.initialPopulation/s.initialPopulation;}
    }
    const footprint=event.affectedPopulation/Math.max(s.population,1), strength=severity*Math.max(.015,footprint);
    if(!good){
      const changes={asteroid:{forest:-35,food:-40,biodiversity:-32,water:-20,dust:70,ocean:-15},earthquake:{food:-3,water:-4},volcano:{dust:13,forest:-8,co2:9},supervolcano:{dust:65,food:-28,forest:-15},tsunami:{ocean:-14,water:-13,food:-8},hurricane:{forest:-9,water:-5,food:-8},wildfire:{forest:-32,biodiversity:-18,co2:35,dust:10},flood:{water:-16,food:-16},drought:{water:-28,food:-25,forest:-12},warming:{co2:150,ocean:-9},iceage:{dust:12,food:-12},pandemic:{}}[type];
      for(const [key,value]of Object.entries(changes)){const delta=value*(type==='supervolcano'?severity:strength);s[key]+=delta;event.effects[key]=delta;}
      if(type==='warming')s.temp+=severity*2;
      if(type==='iceage')s.temp-=severity*5;
      if(type==='asteroid'&&energy>1e21){const winter=clamp(energy/1e23,0,1);s.dust+=winter*70;s.food-=winter*35;event.effects.impactWinter=winter;}
    }
    s.events.push(event); if(s.events.length>160)s.events.shift();this.aggregate(); this.record();return event;
  }
  step(days) {
    if(!Number.isFinite(days)||days<0)throw new Error('Time advance must be finite and nonnegative');
    if(days>36500)throw new Error('Advance at most 100 years at once');
    // Bounded one-day integration keeps the model independent of frame rate and speed.
    for(let remaining=days;remaining>1e-9;){const dt=Math.min(1,remaining);remaining-=dt;this.tick(dt);}
    if(days>0)this.record();return this.state;
  }
  tick(dt){
    const s=this.state;s.day+=dt;
    for(const e of s.events){if(e.age>=e.duration)continue;const t=Math.min(dt,e.duration-e.age);e.age+=t; const fade=1-e.age/e.duration, k=e.severity*t;
      if(e.restoration){
        const gains={reforest:{forest:.07,biodiversity:.025,co2:-.08},ecosystem:{biodiversity:.065,forest:.025,ocean:.025},cleanup:{ocean:.07,water:.03,dust:-.035},biodiversity:{biodiversity:.09},pollution:{ocean:.045,water:.045,co2:-.1},climate:{co2:-.35},freshwater:{water:.11},agriculture:{food:.1},rebuild:{},aid:{food:.025,water:.025},defense:{}}[e.type];
        for(const[key,value]of Object.entries(gains))s[key]+=value*k;
        for(const target of e.targets){const r=s.regions[target.id],a=k*target.exposure;if(e.type==='rebuild')r.infrastructure=clamp(r.infrastructure+.25*a);if(e.type==='aid')r.healthcare=clamp(r.healthcare+.3*a);if(e.type==='defense')r.preparedness=clamp(r.preparedness+.35*a);}
      }else{
        if(e.type==='drought'){s.water-=.025*k*fade;s.food-=.018*k*fade;}
        if(e.type==='wildfire'){s.forest-=.035*k*fade;s.co2+=.045*k*fade;}
        if(e.type==='supervolcano')s.dust+=.015*k*fade;
        if(e.type==='warming')s.co2+=.05*k;
        if(e.type==='iceage')s.temp-=.0015*k;
        for(const target of e.targets){const r=s.regions[target.id];let hazard=e.type==='pandemic'?.00025*(1-r.healthcare/130):e.type==='drought'?.000015:.000003;e.casualties+=this.kill(r,r.population*hazard*k*fade*target.exposure);}
      }
      if(e.age>=e.duration)e.status='resolved';
    }
    s.dust*=Math.exp(-dt/500);
    const equilibrium=1.2+3*Math.log2(s.co2/425)-s.dust*.075;
    s.temp+=(equilibrium-s.temp)*(1-Math.exp(-dt/700));
    const climateStress=Math.max(0,Math.abs(s.temp-1)-1);
    s.water+=(clamp(82-climateStress*9)-(s.water))*.0002*dt;
    s.food+=(clamp(92-s.dust*.65-climateStress*9-(100-s.water)*.18-(100-s.infrastructure)*.2)-s.food)*.0012*dt;
    s.biodiversity+=(clamp(s.forest*.6+s.ocean*.4-climateStress*5)-s.biodiversity)*.00025*dt;
    for(const r of s.regions){
      const deprivation=Math.max(0,45-s.food)+Math.max(0,35-s.water)+Math.max(0,25-r.infrastructure);
      this.kill(r,r.population*deprivation*.0000007*dt*(1-r.healthcare*.005));
      // Baseline annual rates (1.5% births, 0.8% natural mortality) are fictional
      // demographic assumptions. Food insecurity suppresses births; healthcare
      // modifies natural mortality. Neither mechanism revives disaster victims.
      const born=r.population*.015/365*dt*clamp(s.food/85,0,1.15)*clamp((r.healthcare+40)/100,0,1.1);
      const died=Math.min(r.population,r.population*.008/365*dt*clamp(1+(70-r.healthcare)*.008,.65,1.8));
      r.population+=born-died;r.births+=born;r.naturalDeaths+=died;
      const recovery=.008*dt*(s.food/100)*(r.healthcare/100);
      r.infrastructure=clamp(r.infrastructure+recovery);r.healthcare=clamp(r.healthcare+recovery*.6);
    }
    this.migrate(dt);
    this.aggregate();
  }
  migrate(dt){
    const regions=this.state.regions, changes=regions.map(()=>0);
    const safety=r=>r.infrastructure*.6+r.healthcare*.4;
    for(const from of regions){
      const distress=clamp((60-safety(from))/60,0,1);
      if(distress===0||from.population===0)continue;
      const destinations=regions.filter(to=>safety(to)>safety(from)+15).map(to=>({to,weight:to.initialPopulation/(1000+distance(from.lat,from.lon,to.lat,to.lon))}));
      const sum=destinations.reduce((n,d)=>n+d.weight,0);if(!sum)continue;
      const moving=Math.min(from.population,from.population*.03/365*distress*dt);
      changes[from.id]-=moving;from.migrationOut+=moving;
      for(const {to,weight}of destinations){const incoming=moving*weight/sum;changes[to.id]+=incoming;to.migrationIn+=incoming;}
    }
    regions.forEach((r,i)=>{r.population=Math.max(0,r.population+changes[i]);});
  }
  serialize(){return JSON.stringify({format:'project-earth',version:1,state:this.state});}
  load(json){
    // Validate into a separate value; invalid saves never mutate the current world.
    let data;try{data=typeof json==='string'?JSON.parse(json):structuredClone(json);}catch{throw new Error('Invalid save JSON');}
    const s=data?.state;
    if(data?.format!=='project-earth'||data.version!==1||!s||!Array.isArray(s.regions)||s.regions.length!==BASE.length||!Array.isArray(s.events)||s.events.length>160||!Array.isArray(s.history)||s.history.length>240)throw new Error('Unsupported or damaged save');
    const number=(x,lo,hi)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
    // Early v1 saves predate explicit demographics. Their missing ledgers are zero.
    for(const key of ['births','naturalDeaths','migrated'])if(s[key]===undefined)s[key]=0;
    for(const r of s.regions)for(const key of ['births','naturalDeaths','migrationIn','migrationOut'])if(r[key]===undefined)r[key]=0;
    for(const key of ['forest','water','food','biodiversity','ocean','dust','infrastructure','healthcare','preparedness'])if(!number(s[key],0,100))throw new Error('Invalid save metric');
    for(const[key,lo,hi]of [['day',0,1e9],['population',0,1e12],['initialPopulation',1,1e12],['casualties',0,1e12],['temp',-20,30],['co2',180,3000],['nextId',1,1e12]])if(!number(s[key],lo,hi))throw new Error('Invalid save metric');
    s.regions.forEach((r,i)=>{if(r.id!==i||r.name!==BASE[i][0]||!number(r.population,0,1e12)||!number(r.initialPopulation,1,1e12)||!number(r.casualties,0,1e12)||!number(r.lat,-90,90)||!number(r.lon,-180,180)||!number(r.coastal,0,1))throw new Error('Invalid region');for(const key of ['infrastructure','healthcare','preparedness'])if(!number(r[key],0,100))throw new Error('Invalid region metric');for(const key of ['births','naturalDeaths','migrationIn','migrationOut'])if(!number(r[key],0,1e12))throw new Error('Invalid demographic ledger');if(Math.abs(r.initialPopulation+r.births-r.naturalDeaths-r.casualties+r.migrationIn-r.migrationOut-r.population)>1)throw new Error('Inconsistent regional population ledger');});
    for(const e of s.events){if(!disasters.has(e.type)&&!interventions.has(e.type))throw new Error('Invalid event type');for(const[key,lo,hi]of [['lat',-90,90],['lon',-180,180],['age',0,1e9],['duration',1,1e9],['severity',0,1],['energy',0,1e30],['casualties',0,1e12],['id',1,1e12]])if(!number(e[key],lo,hi))throw new Error('Invalid event');if(!Array.isArray(e.targets)||e.targets.length!==BASE.length||e.restoration!==interventions.has(e.type))throw new Error('Invalid event targets');e.targets.forEach((t,i)=>{if(t.id!==i||!number(t.exposure,0,1))throw new Error('Invalid event target');});}
    for(const h of s.history)for(const key of ['day','population','temp','forest','food','biodiversity'])if(typeof h[key]!=='number'||!Number.isFinite(h[key]))throw new Error('Invalid history');
    const population=s.regions.reduce((n,r)=>n+r.population,0),initial=s.regions.reduce((n,r)=>n+r.initialPopulation,0),loss=s.regions.reduce((n,r)=>n+r.casualties,0);
    for(const key of ['births','naturalDeaths','migrated'])if(!number(s[key],0,1e12))throw new Error('Invalid demographic metric');
    const births=s.regions.reduce((n,r)=>n+r.births,0),deaths=s.regions.reduce((n,r)=>n+r.naturalDeaths,0),incoming=s.regions.reduce((n,r)=>n+r.migrationIn,0),outgoing=s.regions.reduce((n,r)=>n+r.migrationOut,0);
    if(Math.abs(population-s.population)>1||Math.abs(initial-s.initialPopulation)>1||Math.abs(loss-s.casualties)>1||Math.abs(births-s.births)>1||Math.abs(deaths-s.naturalDeaths)>1||Math.abs(outgoing-s.migrated)>1||Math.abs(incoming-outgoing)>1||Math.abs(initial+births-deaths-population-loss)>1)throw new Error('Inconsistent population ledger');
    this.state=s;this.aggregate();return s;
  }
}
