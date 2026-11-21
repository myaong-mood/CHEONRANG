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
      readyState:4,duration:89,currentTime:0,dataset:id.startsWith('book-spine-')?{book:id.slice(11)}:{},attributes:{},classList:{add(c){classes.add(c)},remove(c){classes.delete(c)},contains(c){return classes.has(c)},toggle(c,on){if(on)classes.add(c);else classes.delete(c)}},
      addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},
      emit(type,event={}){for(const fn of listeners.get(type)||[])fn(event)},
      getAttribute(k){return this.attributes[k]??null},setAttribute(k,v){this.attributes[k]=v},closest(){return id.startsWith('book-spine-')?element('archive-book-'+id.slice(11)):null},requestFullscreen(){this.fullscreenCalled=true;return Promise.resolve()},focus(){document.activeElement=this},
      querySelector(){return element(id+'-source')},
      pause(){this.paused=true;this.emit('pause')},play(){this.paused=false;this.emit('play');return Promise.resolve()},
      showModal(){this.open=true},close(){this.open=false;this.emit('close')},getBoundingClientRect(){return {left:10,right:100,top:10,bottom:100}},scrollIntoView(){this.scrolled=true}};
    nodes.set(id,n);return n;
  }
  const document={getElementById:element,body:element('body'),activeElement:null,querySelector:s=>{const m=s.match(/^\[data-book="(\d+)"\]$/);return m?element('book-spine-'+m[1]):element(s.slice(1))}};
  const window={document,matchMedia:()=>({matches:true}),scrollTo(){}};
  const ctx={window,document,location:{hash,pathname:'/CHEONRANG/',search:''},history:{replaceState(){}},requestAnimationFrame:fn=>fn(),setTimeout:fn=>fn(),console};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);vm.runInContext(app,ctx);
  return {nodes,element,document,data:ctx.window.CHEONRANG};
}
test('Five unique members have correctly paired local portraits and alpha PNG emblems',()=>{
  const {data}=boot();assert.equal(data.members.length,5);assert.equal(new Set(data.members.map(m=>m.id)).size,5);
  const names={hyeonryun:'현륜',raon:'윤라온',gyeom:'이겸',gijun:'한기준',ungyeol:'소운결'};
  for(const m of data.members){assert.equal(m.name,names[m.id]);for(const kind of [m.id==='gijun'?'portrait.jpg':'portrait.webp','emblem.png'])assert.ok(fs.existsSync(path.join(root,'assets',m.id+'-'+kind)));}
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
test('BGM stays OFF until an explicit click, and pauses when returning to the teaser',()=>{
  const {element:get}=boot();assert.equal(get('site-bgm').paused,true);
  get('enter-site').emit('click');assert.equal(get('site-bgm').paused,true);assert.equal(get('music-toggle').attributes['aria-pressed'],'false');assert.equal(get('music-label').textContent,'BGM OFF');
  get('music-toggle').emit('click');assert.equal(get('site-bgm').paused,false);assert.equal(get('music-label').textContent,'BGM ON');
  get('music-toggle').emit('click');assert.equal(get('site-bgm').paused,true);
  get('music-toggle').emit('click');get('replay-teaser').emit('click');assert.equal(get('site-bgm').paused,true);
  get('enter-site').emit('click');assert.equal(get('site-bgm').paused,true);
});
test('Video controls support seek bounds and full screen',()=>{
  const {element:get}=boot();const video=get('teaser');
  get('video-back').emit('click');assert.equal(video.currentTime,0);
  get('video-forward').emit('click');assert.equal(video.currentTime,10);
  video.currentTime=85;get('video-forward').emit('click');assert.equal(video.currentTime,89);
  get('video-back').emit('click');assert.equal(video.currentTime,79);
  get('video-fullscreen').emit('click');assert.equal(video.fullscreenCalled,true);
  assert.match(html,/<video[^>]*\bcontrols\b/);
});
test('Book spines unfold one record at a time and can be closed again',()=>{
  const {element:get}=boot();
  const click=i=>get('archive-list').emit('click',{target:{closest:()=>get('book-spine-'+i)}});
  click(0);assert.equal(get('archive-page-0').hidden,false);assert.equal(get('book-spine-0').attributes['aria-expanded'],'true');
  click(1);assert.equal(get('archive-page-0').hidden,true);assert.equal(get('archive-page-1').hidden,false);
  click(1);assert.equal(get('archive-page-1').hidden,true);assert.equal(get('archive-list').classList.contains('has-open-book'),false);
  assert.equal((get('archive-list').innerHTML.match(/class="book-spine"/g)||[]).length,6);
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

test('Stylesheet contains no accidental patch markers that invalidate nameplate selectors',()=>{
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  assert.doesNotMatch(css,/^\+/m);
  assert.match(css,/\n\.nameplate-register\{/);
});
