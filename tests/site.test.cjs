const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
function boot(hash='') {
  const nodes = new Map();
  function element(id) {
    if(nodes.has(id)) return nodes.get(id);
    const listeners = new Map(), classes = new Set();
    const n = {id,innerHTML:'',textContent:'',hidden:['main','site-header'].includes(id),open:false,muted:true,paused:true,scrollTop:0,isConnected:true,
      attributes:{},classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)}},
      addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
      emit(type,event={}){for(const fn of listeners.get(type)||[])fn(event)},
      setAttribute(k,v){this.attributes[k]=v},focus(){document.activeElement=this},
      querySelector(){return element(id+'-source')},
      pause(){this.paused=true;this.emit('pause')},play(){this.paused=false;this.emit('play');return Promise.resolve()},
      showModal(){this.open=true},close(){this.open=false;this.emit('close')},getBoundingClientRect(){return {left:10,right:100,top:10,bottom:100}},scrollIntoView(){this.scrolled=true}};
    nodes.set(id,n);return n;
  }
  const document={getElementById:element,body:element('body'),activeElement:null,querySelector:s=>element(s.slice(1))};
  const window={document,matchMedia:()=>({matches:true}),scrollTo(){}};
  const ctx={window,document,location:{hash,pathname:'/CHEONRANG/',search:''},history:{replaceState(){}},requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn(),console};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);vm.runInContext(app,ctx);
  return {nodes,element,document,data:ctx.window.CHEONRANG};
}
test('Five unique members have correctly paired local portraits and alpha PNG emblems',()=>{
  const {data}=boot();assert.equal(data.members.length,5);assert.equal(new Set(data.members.map(m=>m.id)).size,5);
  const names={hyeonryun:'현륜',raon:'윤라온',gyeom:'이겸',gijun:'한기준',ungyeol:'소운결'};
  for(const m of data.members){assert.equal(m.name,names[m.id]);for(const kind of ['portrait.webp','emblem.png'])assert.ok(fs.existsSync(path.join(root,'assets',m.id+'-'+kind)));}
  assert.equal(data.members.filter(m=>m.leader).length,1);
});
test('Landing enters main and teaser replay returns without losing content',()=>{
  const b=boot(),get=b.element;assert.equal(get('main').hidden,true);get('enter-site').emit('click');assert.equal(get('main').hidden,false);assert.equal(get('landing').hidden,true);get('replay-teaser').emit('click');assert.equal(get('landing').hidden,false);assert.equal(get('main').hidden,true);
});
test('Portrait/emblem clicks open the named profile; close and outside clicks restore focus',()=>{
  const {element:get,document}=boot();const trigger={dataset:{member:'raon'},isConnected:true,focus(){this.focused=true}};
  get('team-roster').emit('click',{target:{closest:()=>trigger}});assert.equal(get('profile-dialog').open,true);assert.match(get('profile-content').innerHTML,/윤라온/);assert.match(get('profile-content').innerHTML,/raon-emblem.png/);
  get('profile-dialog').emit('click',{target:get('profile-dialog'),clientX:50,clientY:50});assert.equal(get('profile-dialog').open,true);
  get('profile-dialog').emit('click',{target:get('profile-dialog'),clientX:0,clientY:0});assert.equal(get('profile-dialog').open,false);assert.equal(trigger.focused,true);assert.equal(document.body.classList.contains('modal-open'),false);
  get('team-roster').emit('click',{target:{closest:()=>trigger}});get('close-profile').emit('click');assert.equal(get('profile-dialog').open,false);
});
test('Three separate rank systems render four tiles each with different insignia',()=>{
  const {element:get,data}=boot();for(const type of ['rift','beast','awakened']){assert.equal(data.ranks[type].length,4);assert.equal((get(type+'-ranks').innerHTML.match(/class="rank-tile"/g)||[]).length,4);}
  assert.notEqual(get('rift-ranks').innerHTML,get('beast-ranks').innerHTML);assert.match(get('beast-ranks').innerHTML,/邪/);assert.match(get('awakened-ranks').innerHTML,/凡/);
});
test('Direct section URLs reveal main; missing video is non-blocking',()=>{
  const {element:get}=boot('#team');assert.equal(get('main').hidden,false);assert.equal(get('team').scrolled,true);get('teaser-source').emit('error');assert.equal(get('landing').classList.contains('video-unavailable'),true);
});
test('Entering main starts BGM, the music button toggles it, and teaser replay pauses it',()=>{
  const {element:get}=boot();assert.equal(get('site-bgm').paused,true);
  get('enter-site').emit('click');assert.equal(get('site-bgm').paused,false);assert.equal(get('teaser').paused,true);assert.equal(get('music-toggle').attributes['aria-pressed'],'true');
  get('music-toggle').emit('click');assert.equal(get('site-bgm').paused,true);
  get('music-toggle').emit('click');assert.equal(get('site-bgm').paused,false);
  get('replay-teaser').emit('click');assert.equal(get('site-bgm').paused,true);
});
test('Landing logo and decoration never occupy the video aperture',()=>{
  const aperture=html.match(/<div class="video-aperture">([\s\S]*?)<\/div>/)[1];
  assert.match(aperture,/<video/);assert.doesNotMatch(aperture,/<img|landing-logo|landing-shade/);
  assert.ok(html.indexOf('class="landing-logo"')<html.indexOf('class="video-aperture"'));
  assert.doesNotMatch(html,/class="landing-shade"/);
});
test('All static local references exist except the explicitly pending teaser',()=>{
  const refs=[...html.matchAll(/(?:src|href|poster)="([^"#]+)"/g)].map(m=>m[1]).filter(x=>!/^https?:/.test(x));
  for(const ref of refs){if(ref==='CHEONRANG_MAIN_TEASER.MP4')continue;assert.ok(fs.existsSync(path.join(root,ref.split('?')[0])),ref);}
  assert.match(html,/<meta charset="utf-8">/);assert.match(html,/<dialog[^>]*aria-labelledby="profile-name"/);assert.doesNotMatch(app,/\.secret\b/);
});
