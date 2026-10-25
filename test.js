const Sim=require('./sim.js'),assert=require('assert');let n=0;const t=(name,f)=>{f();n++;console.log('ok -',name)};
const ACTS=[{t:100,type:'crop'},{t:150,type:'flood',x:10,y:8,r:4},{t:200,type:'policy',k:'subsidy',v:.5},{t:260,type:'outbreak',n:5},{t:300,type:'close'}];
t('same seed+actions => identical state; different seed differs',()=>{
 assert.equal(Sim.hash(Sim.replay(7,ACTS,500)),Sim.hash(Sim.replay(7,ACTS,500)));
 assert.notEqual(Sim.hash(Sim.replay(7,ACTS,500)),Sim.hash(Sim.replay(8,ACTS,500)))});
t('live play with mid-run actions, then rewind replay, reproduces the state',()=>{
 const s=Sim.create(7);let snap;
 while(s.t<500){if(s.t===150)snap=[Sim.hash(s),Sim.clone(s)];for(const a of ACTS)if(a.t===s.t)Sim.apply(s,a);Sim.tick(s)}
 assert.equal(Sim.hash(s),Sim.hash(Sim.replay(7,ACTS,500)));
 assert.equal(snap[0],Sim.hash(Sim.replay(7,ACTS.filter(a=>a.t<150),150)));
 assert.equal(Sim.hash(snap[1]),snap[0])});
t('money and food accounting is conserved',()=>{
 const s=Sim.replay(3,ACTS,700);assert(Math.abs(Sim.money(s)-s.m0)<1e-6,'money '+Sim.money(s)+' vs '+s.m0);
 assert(Math.abs(s.f0+s.led.prod-s.led.eaten-s.led.lost-Sim.food(s))<1e-6,'food ledger')});
t('closure removes exactly that workplace\'s jobs',()=>{
 const s=Sim.replay(5,[],10),id=s.b.find(b=>b.type==='office').id,before=s.c.filter(c=>c.job===id).length,others=s.c.filter(c=>c.job!=null&&c.job!==id).map(c=>c.id+':'+c.job);
 assert(before>0);Sim.apply(s,{t:s.t,type:'close',id});
 assert.equal(s.c.filter(c=>c.job===id).length,0);assert.deepEqual(s.c.filter(c=>c.job!=null).map(c=>c.id+':'+c.job),others);assert.equal(s.b[id].open,false)});
t('flood closes only buildings inside its radius',()=>{
 const s=Sim.replay(5,[],5);Sim.apply(s,{t:5,type:'flood',x:12,y:8,r:3});
 for(const b of s.b)if(b.type!=='home')assert.equal(!b.open,Math.hypot(b.x-12,b.y-8)<=3,nm=Sim.nm(b))});
t('health stays within [0,100] under stress',()=>{
 const s=Sim.create(11);for(let i=0;i<900;i++){for(const a of ACTS)if(a.t===s.t)Sim.apply(s,a);Sim.tick(s);
  for(const c of s.c)assert(c.health>=0&&c.health<=100&&Number.isFinite(c.health))}});
t('hunger damages health when no food/money (controlled)',()=>{
 const s=Sim.create(2);for(const c of s.c){c.food=0;c.money=0}const h0=s.c[0].health;Sim.run(s,[],61);assert(s.c[0].health<h0)});
t('disease spreads by proximity only; hospital beds bounded',()=>{
 const R=Sim.R,p=R.infectP;R.infectP=1;
 let s=Sim.create(4);for(const c of s.c){c.x=c.y=5;c.job=null;c.home=0}s.c[0].ill=true;Sim.tick(s);assert(s.c.filter(c=>c.ill).length>1,'spread');
 s=Sim.create(4);for(const c of s.c){c.x=(c.id%10)*2.2;c.y=Math.floor(c.id/10)*1.6}Sim.tick(s);assert.equal(s.c.filter(c=>c.ill).length,0,'no ill => none');
 R.infectP=p;
 s=Sim.create(4);s.pol.hosp=3;const hs=s.b.find(b=>b.type==='hospital');for(const c of s.c.slice(0,10)){c.ill=true;c.health=60;c.x=hs.x;c.y=hs.y}
 for(let i=0;i<5;i++){Sim.tick(s);assert(s.c.filter(c=>c.adm).length<=3)}});
console.log(n+' tests passed');
