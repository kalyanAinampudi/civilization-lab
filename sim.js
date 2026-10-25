// CIVILIZATION LAB engine. Pure, seeded, deterministic. Edit RULES (R) to change the economy.
(function(g){
const R={dayLen:60,price:2,wholesale:1,wage:{farm:3,shop:3,office:4,hospital:3},yield:3,hungerDmg:10,
 speed:.4,infectR:1.5,infectP:.03,illDmg:.15,healRate:3,repair:120,gov0:8000,
 cap:{farm:8,shop:3,office:8,hospital:6},shopCap:120,buyMax:3};
function rnd(s){s.rng=(s.rng+0x6D2B79F5)|0;let t=s.rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
const L=(s,m)=>{s.log.push({t:s.t,m});if(s.log.length>300)s.log.shift()};
const nm=b=>b.type[0].toUpperCase()+b.id, dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const sum=(a,f)=>a.reduce((x,y)=>x+f(y),0);
const money=s=>sum(s.c,c=>c.money)+sum(s.b,b=>b.cash)+s.gov.money;
const food=s=>sum(s.c,c=>c.food)+sum(s.b,b=>b.stock);
function create(seed){
 const s={seed,rng:seed|0,t:0,W:24,H:16,gov:{money:R.gov0,tax:0,subsidy:0,wages:0},pol:{subsidy:0,hosp:R.cap.hospital,tax:.1},
  b:[],c:[],log:[],hist:[],led:{prod:0,eaten:0,lost:0},inf:0};
 const used=new Set();
 const add=(type,n,stock,cash)=>{for(let i=0;i<n;i++){let x,y;do{x=1+Math.floor(rnd(s)*(s.W-2));y=1+Math.floor(rnd(s)*(s.H-2))}while(used.has(x+','+y));
  used.add(x+','+y);s.b.push({id:s.b.length,type,x,y,stock,cash,open:true,reopen:0,ym:1,ymUntil:0})}};
 add('farm',5,20,60);add('shop',3,60,80);add('office',4,0,0);add('hospital',1,0,0);add('home',25,0,0);
 const homes=s.b.filter(b=>b.type==='home'),slots=[];
 for(const b of s.b)for(let k=0;k<(R.cap[b.type]||0);k++)slots.push(b.id);
 for(let i=slots.length-1;i>0;i--){const j=Math.floor(rnd(s)*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]]}
 for(let i=0;i<100;i++){const h=homes[i%25];s.c.push({id:i,x:h.x,y:h.y,home:h.id,job:i<slots.length?slots[i]:null,
  food:2+Math.floor(rnd(s)*4),money:20+Math.floor(rnd(s)*20),health:100,ill:false,adm:false,alive:true,goal:'rest',tgt:h.id,hist:[],cause:''})}
 s.m0=money(s);s.f0=food(s);sample(s);return s}
function stats(s){const a=s.c.filter(c=>c.alive),m=a.map(c=>c.money).sort((x,y)=>x-y);
 return{pop:a.length,food:food(s),emp:a.length?a.filter(c=>c.job!=null).length/a.length*100:0,
  med:m.length?(m[m.length>>1]+m[(m.length-1)>>1])/2:0,hp:a.length?sum(a,c=>c.health)/a.length:0,gov:s.gov.money}}
function sample(s){s.hist.push({t:s.t,...stats(s)})}
function close(s,b,why,until){if(!b.open)return 0;b.open=false;b.reopen=until;const lf=b.stock;s.led.lost+=lf;b.stock=0;let n=0;
 for(const c of s.c)if(c.alive&&c.job===b.id){c.job=null;n++}
 if(b.type==='hospital')for(const c of s.c)c.adm=false;
 L(s,`${nm(b)} closed (${why}): ${n} jobs lost, ${lf} food destroyed`);return n}
function apply(s,a){
 if(a.type==='policy'){s.pol[a.k]=a.v;L(s,`POLICY ${a.k} set to ${a.v}`)}
 else if(a.type==='flood'){const hit=s.b.filter(b=>Math.hypot(b.x-a.x,b.y-a.y)<=a.r);
  L(s,`FLOOD at (${a.x},${a.y}) r=${a.r}: ${hit.length} buildings in the affected area`);
  for(const b of hit){if(b.type==='home'){for(const c of s.c)if(c.alive&&c.home===b.id){const l=Math.floor(c.food/2);c.food-=l;s.led.lost+=l}}
   else close(s,b,'flood damage',s.t+R.repair)}}
 else if(a.type==='close'){const w=s.b.filter(b=>b.open&&['farm','shop','office'].includes(b.type));if(!w.length&&a.id==null)return;
  close(s,a.id!=null?s.b[a.id]:w[Math.floor(rnd(s)*w.length)],'workplace shutdown',s.t+R.repair)}
 else if(a.type==='crop'){for(const b of s.b)if(b.type==='farm'){b.ym=.2;b.ymUntil=s.t+R.dayLen*3}L(s,'CROP FAILURE: farm yield cut to 20% for 3 days')}
 else if(a.type==='outbreak'){let n=0;for(const c of s.c){if(n>=a.n)break;if(c.alive&&!c.ill&&rnd(s)<.3){c.ill=true;n++}}L(s,`OUTBREAK: ${n} citizens infected`)}}
const near=(s,c,f)=>{let best=null,bd=1e9;for(const b of s.b)if(f(b)){const d=dist(c,b);if(d<bd){bd=d;best=b}}return best};
function decide(s,c,tod){const hs=s.b.find(b=>b.type==='hospital'),r=Math.round(c.health);
 if(c.adm)return['treatment',hs,`admitted, health ${r}`];
 if(hs.open&&((c.ill&&c.health<75)||c.health<40))return['seek treatment',hs,`ill=${c.ill}, health ${r} below threshold`];
 const p=R.price*(1-s.pol.subsidy);
 if(c.food<=1&&c.money>=p){const sh=near(s,c,b=>b.type==='shop'&&b.open&&b.stock>0);if(sh)return['buy food',sh,`food ${c.food}<=1, money ${Math.round(c.money)}>=price ${p.toFixed(2)}, ${nm(sh)} has ${sh.stock}`]}
 const j=c.job!=null?s.b[c.job]:null;
 if(j&&j.open&&tod<40)return['work',j,`employed at ${nm(j)}, workday`];
 return['rest',s.b[c.home],c.job==null?'unemployed, no urgent need':j&&!j.open?'workplace closed':'off hours'];}
function interact(s,c,b){
 if(b.type==='shop'&&c.goal==='buy food'&&b.open){let n=0;
  while(n<R.buyMax&&b.stock>0){const sub=s.gov.money>=R.price*s.pol.subsidy?R.price*s.pol.subsidy:0,pay=R.price-sub;if(c.money<pay)break;
   c.money-=pay;b.cash+=R.price;s.gov.money-=sub;s.gov.subsidy+=sub;b.stock--;c.food++;n++}
  if(n&&b.stock===0)L(s,`${nm(b)} sold out`);}
 else if(b.type==='hospital'&&b.open){
  if(!c.adm){const beds=s.c.filter(x=>x.adm).length;if(beds<s.pol.hosp)c.adm=true;else if(s.fullAt!==s.t){s.fullAt=s.t;L(s,`Hospital full (${beds}/${s.pol.hosp} beds): patients wait untreated`)}}
  if(c.adm){c.health=Math.min(100,c.health+R.healRate);if(c.health>=85){c.adm=false;c.ill=false}}}}
function dayEnd(s){
 for(const b of s.b){if(!b.open)continue;const ws=s.c.filter(c=>c.alive&&c.job===b.id);
  if(b.type==='farm'){const p=ws.length*R.yield*b.ym;b.stock+=p;s.led.prod+=p}
  const w=R.wage[b.type];if(!w)continue;const pub=b.type==='office'||b.type==='hospital';let un=0;
  for(const c of ws){if(pub?s.gov.money>=w:b.cash>=w){if(pub){s.gov.money-=w;s.gov.wages+=w}else b.cash-=w;
   const tx=w*s.pol.tax;c.money+=w-tx;s.gov.money+=tx;s.gov.tax+=tx}else un++}
  if(un)L(s,`${nm(b)} could not pay ${un} wages (${pub?'treasury empty':'no cash'})`)}
 for(const sh of s.b.filter(b=>b.type==='shop'&&b.open)){const fm=near(s,sh,b=>b.type==='farm'&&b.open&&b.stock>0);if(!fm)continue;
  const q=Math.min(R.shopCap-sh.stock,30,fm.stock,Math.floor(sh.cash/R.wholesale));if(q>0){fm.stock-=q;sh.stock+=q;sh.cash-=q*R.wholesale;fm.cash+=q*R.wholesale}}
 let hungry=0;for(const c of s.c){if(!c.alive)continue;
  if(c.food>0){c.food--;s.led.eaten++;c.health=Math.min(100,c.health+2)}else{c.health-=R.hungerDmg;c.cause='hunger';hungry++;c.hist.push({t:s.t,g:'hungry',why:'no food at day end, -'+R.hungerDmg+' health'});if(c.hist.length>8)c.hist.shift()}}
 const stock=sum(s.b.filter(b=>b.type==='shop'&&b.open),b=>b.stock);
 if(hungry)L(s,`${hungry} citizens went hungry (open shop stock ${stock}, ${s.c.filter(c=>c.alive&&c.job==null).length} unemployed)`);
 if(s.inf){L(s,`${s.inf} new infections today (contact with ill citizens)`);s.inf=0}
 const vac={};for(const b of s.b)if(b.open&&R.cap[b.type])vac[b.id]=R.cap[b.type]-s.c.filter(c=>c.alive&&c.job===b.id).length;
 for(const c of s.c)if(c.alive&&c.job==null){const id=Object.keys(vac).find(k=>vac[k]>0);if(id!=null){vac[id]--;c.job=+id;c.hist.push({t:s.t,g:'hired',why:'vacancy at '+nm(s.b[id])})}}}
function tick(s){const tod=s.t%R.dayLen;
 for(const b of s.b){if(!b.open&&b.reopen&&s.t>=b.reopen){b.open=true;b.reopen=0;L(s,nm(b)+' reopened after repairs')}if(b.ymUntil&&s.t>=b.ymUntil){b.ym=1;b.ymUntil=0;L(s,'Crop yields recovered')}}
 if(tod===0&&s.t>0)dayEnd(s);
 for(const c of s.c){if(!c.alive)continue;const[g,tb,why]=decide(s,c,tod);
  if(g!==c.goal||tb.id!==c.tgt){c.goal=g;c.tgt=tb.id;c.hist.push({t:s.t,g,why});if(c.hist.length>8)c.hist.shift()}
  const d=dist(c,tb);if(d>R.speed){c.x+=(tb.x-c.x)/d*R.speed;c.y+=(tb.y-c.y)/d*R.speed}else{c.x=tb.x;c.y=tb.y;interact(s,c,tb)}
  if(c.ill&&!c.adm){c.health-=R.illDmg;c.cause='illness';if(c.health>50&&rnd(s)<.004)c.ill=false}}
 for(const i of s.c.filter(c=>c.alive&&c.ill))for(const j of s.c)if(j.alive&&!j.ill&&dist(i,j)<R.infectR&&rnd(s)<R.infectP*(j.health<50?2:1)){
  j.ill=true;s.inf++;j.hist.push({t:s.t,g:'infected',why:'close to ill citizen #'+i.id});if(j.hist.length>8)j.hist.shift()}
 for(const c of s.c)if(c.alive){if(c.health>100)c.health=100;if(c.health<=0){c.health=0;c.alive=false;c.adm=false;s.gov.money+=c.money;c.money=0;s.led.lost+=c.food;c.food=0;
  L(s,`Citizen #${c.id} died (${c.cause||'unknown'})`)}}
 s.t++;if(s.t%10===0)sample(s)}
function run(s,acts,T){while(s.t<T){for(const a of acts)if(a.t===s.t)apply(s,a);tick(s)}return s}
const replay=(seed,acts,T)=>run(create(seed),acts,T);
function hash(s){const j=JSON.stringify(s);let h=5381;for(let i=0;i<j.length;i++)h=(h*33^j.charCodeAt(i))>>>0;return h}
g.Sim={R,create,tick,apply,run,replay,hash,stats,money,food,nm,clone:s=>JSON.parse(JSON.stringify(s))};
if(typeof module!=='undefined')module.exports=g.Sim;
})(typeof window!=='undefined'?window:globalThis);
