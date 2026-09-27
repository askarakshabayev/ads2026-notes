/* Режим показа: масштаб шрифта, полный экран, скрытие меню, доска.
   Самодостаточен — не зависит от notes.js и не конфликтует с инлайновым
   скриптом lab01. Тему переключает сам, если своей кнопки на странице нет. */
(function(){
"use strict";
var root=document.documentElement, body=document.body;

/* ---------- масштаб шрифта ---------- */
var STEPS=[0.85,1,1.15,1.3,1.5,1.75,2], fsIdx=1;
try{ var s=localStorage.getItem('ads-fs'); if(s!==null) fsIdx=Math.max(0,Math.min(STEPS.length-1,+s)); }catch(e){}
function applyFs(){
  root.style.setProperty('--fs',STEPS[fsIdx]);
  var v=document.getElementById('pb-fsval');
  if(v) v.textContent=Math.round(STEPS[fsIdx]*100)+'%';
  try{ localStorage.setItem('ads-fs',fsIdx); }catch(e){}
  if(WB.open) wbResize();
}
function bumpFs(d){ fsIdx=Math.max(0,Math.min(STEPS.length-1,fsIdx+d)); applyFs(); }

/* ---------- тема ---------- */
function toggleTheme(){
  var cur=root.getAttribute('data-theme');
  if(!cur){ cur=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'; }
  var nx=cur==='dark'?'light':'dark';
  root.setAttribute('data-theme',nx);
  try{ localStorage.setItem('ads-theme',nx); }catch(e){}
  if(WB.open) wbRedraw();
}
try{ var th=localStorage.getItem('ads-theme'); if(th) root.setAttribute('data-theme',th); }catch(e){}

/* ---------- полный экран ---------- */
function toggleFull(){
  if(!document.fullscreenElement){
    (root.requestFullscreen||root.webkitRequestFullscreen||function(){}).call(root);
  }else{
    (document.exitFullscreen||document.webkitExitFullscreen||function(){}).call(document);
  }
}
document.addEventListener('fullscreenchange',function(){
  var b=document.getElementById('pb-full');
  if(b) b.classList.toggle('on',!!document.fullscreenElement);
});

/* ---------- меню ---------- */
function toggleRail(){
  var off=body.classList.toggle('rail-off');
  var b=document.getElementById('pb-rail');
  if(b) b.classList.toggle('on',off);
  try{ localStorage.setItem('ads-rail',off?'1':'0'); }catch(e){}
}
try{ if(localStorage.getItem('ads-rail')==='1') body.classList.add('rail-off'); }catch(e){}

/* ---------- доска ---------- */
var WB={open:false,blank:false,strokes:[],cur:null,color:'#2f44c9',width:4,erase:false};
var cv,ctx;
function wbBuild(){
  var w=document.createElement('div'); w.className='wb-wrap';
  cv=document.createElement('canvas'); cv.className='wb-canvas';
  w.appendChild(cv); body.appendChild(w);
  ctx=cv.getContext('2d');

  var t=document.createElement('div'); t.className='wb-tools'; t.id='wb-tools';
  t.style.display='none';
  var colors=['#2f44c9','#c0374b','#0d6b53','#d98324','#121a25','#ffffff'];
  t.innerHTML='<span class="lbl">pen</span>'+
    colors.map(function(c,i){ return '<button class="wb-sw'+(i===0?' on':'')+'" data-c="'+c+'" style="background:'+c+'" title="'+c+'"></button>'; }).join('')+
    '<span class="lbl" style="margin-left:6px">size</span><input type="range" id="wb-size" min="1" max="24" value="4">'+
    '<button id="wb-erase">eraser</button>'+
    '<button id="wb-undo">undo</button>'+
    '<button id="wb-clear">clear</button>'+
    '<button id="wb-blank">blank page</button>'+
    '<button id="wb-close">✕ close</button>';
  body.appendChild(t);

  var h=document.createElement('div'); h.className='wb-hint'; h.id='wb-hint';
  h.style.display='none';
  h.textContent='Drawing over the page — scrolling is paused. Esc to close.';
  body.appendChild(h);

  cv.addEventListener('pointerdown',wbDown);
  cv.addEventListener('pointermove',wbMove);
  window.addEventListener('pointerup',wbUp);
  window.addEventListener('pointercancel',wbUp);
  window.addEventListener('resize',function(){ if(WB.open) wbResize(); });

  t.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b) return;
    if(b.dataset.c){
      Array.prototype.forEach.call(t.querySelectorAll('.wb-sw'),function(x){x.classList.remove('on');});
      b.classList.add('on'); WB.color=b.dataset.c; WB.erase=false;
      document.getElementById('wb-erase').classList.remove('on'); return;
    }
    if(b.id==='wb-erase'){ WB.erase=!WB.erase; b.classList.toggle('on',WB.erase); }
    if(b.id==='wb-undo'){ WB.strokes.pop(); wbRedraw(); }
    if(b.id==='wb-clear'){ WB.strokes=[]; wbRedraw(); }
    if(b.id==='wb-blank'){ WB.blank=!WB.blank; wbApplyBlank(); }
    if(b.id==='wb-close'){ wbToggle(false); }
  });
  document.getElementById('wb-size').addEventListener('input',function(){ WB.width=+this.value; });
}
function wbResize(){
  var dpr=window.devicePixelRatio||1;
  cv.width=Math.floor(cv.clientWidth*dpr); cv.height=Math.floor(cv.clientHeight*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); wbRedraw();
}
function wbRedraw(){
  if(!ctx) return;
  ctx.clearRect(0,0,cv.clientWidth,cv.clientHeight);
  ctx.lineCap='round'; ctx.lineJoin='round';
  WB.strokes.forEach(function(s){
    if(s.pts.length<2) { if(!s.pts.length) return; s=({color:s.color,width:s.width,erase:s.erase,pts:[s.pts[0],[s.pts[0][0]+0.1,s.pts[0][1]]]}); }
    ctx.globalCompositeOperation = s.erase?'destination-out':'source-over';
    ctx.strokeStyle=s.color; ctx.lineWidth=s.width;
    ctx.beginPath(); ctx.moveTo(s.pts[0][0],s.pts[0][1]);
    for(var i=1;i<s.pts.length;i++) ctx.lineTo(s.pts[i][0],s.pts[i][1]);
    ctx.stroke();
  });
  ctx.globalCompositeOperation='source-over';
}
function pt(e){ var r=cv.getBoundingClientRect(); return [e.clientX-r.left,e.clientY-r.top]; }
function wbDown(e){ cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);
  WB.cur={color:WB.color,width:WB.erase?WB.width*3:WB.width,erase:WB.erase,pts:[pt(e)]};
  WB.strokes.push(WB.cur); wbRedraw(); }
function wbMove(e){ if(!WB.cur) return; WB.cur.pts.push(pt(e)); wbRedraw(); }
function wbUp(){ WB.cur=null; }
function wbApplyBlank(){
  /* wb-blank держим на body только пока доска открыта, но сам флаг WB.blank
     переживает закрытие — иначе режим слетал на каждом D. */
  body.classList.toggle('wb-blank', WB.open && WB.blank);
  var bb=document.getElementById('wb-blank'); if(bb) bb.classList.toggle('on',WB.blank);
  var h=document.getElementById('wb-hint');
  if(h) h.textContent = WB.blank
    ? 'Blank board. Esc to close.'
    : 'Drawing over the page — scrolling is paused. Esc to close.';
}
function wbToggle(on){
  WB.open = (on===undefined) ? !WB.open : on;
  body.classList.toggle('wb-on',WB.open);
  document.getElementById('wb-tools').style.display=WB.open?'flex':'none';
  document.getElementById('wb-hint').style.display=WB.open?'block':'none';
  var b=document.getElementById('pb-draw'); if(b) b.classList.toggle('on',WB.open);
  wbApplyBlank();
  if(WB.open) wbResize();
}


/* ---------- слайды ----------
   Страница остаётся той же — ничего не клонируется, поэтому демо и редактор
   работают прямо на слайде. Слайд = титул или одна карточка бита; «What to say»
   — заметки докладчика, по умолчанию скрыты (N). Кликер шлёт PageUp/PageDown. */
var SL={on:false,i:0,list:[],notes:false};
var SL_KEY='ads-sl-i:'+location.pathname;
function slBuild(){
  var mast=document.querySelector('.masthead');
  if(mast) SL.list.push({title:true,label:'Title'});
  [].forEach.call(document.querySelectorAll('section.beat'),function(sec){
    var h=sec.querySelector('.beat-head h2'), n=sec.querySelector('.beat-n');
    var label=(n?n.textContent+' · ':'')+(h?h.textContent:'');
    var cards=[].filter.call(sec.querySelectorAll('.stack .card'),function(c){ return !c.parentNode.closest('.card'); });
    if(!cards.length) SL.list.push({sec:sec,card:null,label:label});
    cards.forEach(function(c,k){ SL.list.push({sec:sec,card:c,label:label+(cards.length>1?' ('+(k+1)+'/'+cards.length+')':'')}); });
  });
}
function slClear(){
  [].forEach.call(document.querySelectorAll('.sl-cur'),function(x){ x.classList.remove('sl-cur'); });
}
function slShow(i){
  SL.i=Math.max(0,Math.min(SL.list.length-1,i));
  var s=SL.list[SL.i];
  slClear();
  body.classList.toggle('sl-title',!!s.title);
  if(s.sec) s.sec.classList.add('sl-cur');
  if(s.card) s.card.classList.add('sl-cur');
  body.classList.toggle('sl-nocard',!!s.sec&&!s.card);
  document.getElementById('sl-pos').textContent=(SL.i+1)+' / '+SL.list.length;
  document.getElementById('sl-lbl').textContent=s.label;
  document.getElementById('sl-prog').style.width=((SL.i+1)/SL.list.length*100)+'%';
  window.scrollTo(0,0);
  try{ localStorage.setItem(SL_KEY,SL.i); }catch(e){}
}
/* вход с того места, которое сейчас на экране */
function slFromScroll(){
  var best=0;
  SL.list.forEach(function(s,k){
    var el=s.card||s.sec; if(!el) return;
    if(el.getBoundingClientRect().top<window.innerHeight*0.4) best=k;
  });
  return best;
}
function slToggle(on,idx){
  if(!SL.list.length) return;
  var start = idx!==undefined ? idx : (on===undefined?!SL.on:on) ? slFromScroll() : 0;
  SL.on = on===undefined ? !SL.on : on;
  body.classList.toggle('sl',SL.on);
  document.getElementById('sl-bar').style.display=SL.on?'flex':'none';
  var b=document.getElementById('pb-slides'); if(b) b.classList.toggle('on',SL.on);
  try{ localStorage.setItem('ads-sl',SL.on?'1':'0'); }catch(e){}
  if(SL.on) slShow(start);
  else {
    /* выходим туда же, где были на слайде */
    var s=SL.list[SL.i]; slClear(); body.classList.remove('sl-title','sl-nocard');
    var el=s&&(s.card||s.sec); if(el) el.scrollIntoView({block:'start'});
  }
  if(WB.open) wbResize();
}
function slNotes(){
  SL.notes=!SL.notes; body.classList.toggle('sl-notes',SL.notes);
  var b=document.getElementById('sl-notes'); if(b) b.classList.toggle('on',SL.notes);
  try{ localStorage.setItem('ads-sl-notes',SL.notes?'1':'0'); }catch(e){}
}
function slBar(){
  var bar=document.createElement('div'); bar.className='sl-bar'; bar.id='sl-bar';
  bar.innerHTML='<button id="sl-prev" title="Previous (←, PgUp)">‹</button>'+
    '<span class="pos" id="sl-pos"></span>'+
    '<button id="sl-next" title="Next (→, Space, PgDn)">›</button>'+
    '<span class="lbl" id="sl-lbl"></span>'+
    '<button id="sl-notes" class="txt" title="Speaker notes (N)">notes</button>'+
    '<button id="sl-exit" class="txt" title="Back to the page (P, Esc)">exit</button>';
  body.appendChild(bar);
  var prog=document.createElement('div'); prog.className='sl-prog'; prog.innerHTML='<i id="sl-prog"></i>';
  bar.appendChild(prog);
  document.getElementById('sl-prev').onclick=function(){ slShow(SL.i-1); };
  document.getElementById('sl-next').onclick=function(){ slShow(SL.i+1); };
  document.getElementById('sl-notes').onclick=slNotes;
  document.getElementById('sl-exit').onclick=function(){ slToggle(false); };
}
function slInit(){
  slBuild();
  if(!SL.list.length) return;
  slBar();
  try{
    if(localStorage.getItem('ads-sl-notes')==='1') slNotes();
    if(localStorage.getItem('ads-sl')==='1'){
      var i=parseInt(localStorage.getItem(SL_KEY),10);
      slToggle(true,isNaN(i)?0:i);
    }
  }catch(e){}
}

/* ---------- панель ---------- */
function buildBar(){
  var hasRail=!!document.querySelector('.rail');
  var bar=document.createElement('div'); bar.className='pbar';
  bar.innerHTML=
    '<button id="pb-minus" title="Smaller text (−)">A−</button>'+
    '<span class="fsval" id="pb-fsval">100%</span>'+
    '<button id="pb-plus" title="Bigger text (+)">A+</button>'+
    '<span class="sep"></span>'+
    (hasRail?'<button id="pb-rail" title="Hide the menu (M)">☰</button>':'')+
    (document.querySelector('section.beat')?'<button id="pb-slides" title="Slides (P)">▭</button>':'')+
    '<button id="pb-draw" title="Whiteboard (D)">✎</button>'+
    '<button id="pb-full" title="Fullscreen (F)">⛶</button>'+
    '<button id="pb-theme" title="Light / dark">◐</button>';
  body.appendChild(bar);
  document.getElementById('pb-minus').onclick=function(){bumpFs(-1);};
  document.getElementById('pb-plus').onclick=function(){bumpFs(1);};
  document.getElementById('pb-draw').onclick=function(){wbToggle();};
  document.getElementById('pb-full').onclick=toggleFull;
  document.getElementById('pb-theme').onclick=toggleTheme;
  var sb=document.getElementById('pb-slides'); if(sb) sb.onclick=function(){ slToggle(); };
  if(hasRail){
    document.getElementById('pb-rail').onclick=toggleRail;
    if(body.classList.contains('rail-off')) document.getElementById('pb-rail').classList.add('on');
  }
}

/* ---------- горячие клавиши ---------- */
document.addEventListener('keydown',function(e){
  var t=e.target.tagName;
  if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||e.metaKey||e.ctrlKey||e.altKey) return;
  var k=e.key;
  if(k==='Escape'&&WB.open){ wbToggle(false); e.preventDefault(); return; }
  /* листание — только когда поверх слайда ничего не открыто */
  if(SL.on&&!WB.open&&!body.classList.contains('ed-on')){
    var nx=k==='ArrowRight'||k==='PageDown'||(k===' '&&!e.shiftKey&&t!=='BUTTON');
    var pv=k==='ArrowLeft'||k==='PageUp'||(k===' '&&e.shiftKey&&t!=='BUTTON');
    if(nx){ slShow(SL.i+1); e.preventDefault(); return; }
    if(pv){ slShow(SL.i-1); e.preventDefault(); return; }
    if(k==='Home'){ slShow(0); e.preventDefault(); return; }
    if(k==='End'){ slShow(SL.list.length-1); e.preventDefault(); return; }
    if(k==='Escape'){ slToggle(false); e.preventDefault(); return; }
    if(k==='n'||k==='N'){ slNotes(); e.preventDefault(); return; }
  }
  if((k==='p'||k==='P')&&SL.list.length){ slToggle(); e.preventDefault(); return; }
  if(k==='+'||k==='='){ bumpFs(1); e.preventDefault(); }
  else if(k==='-'||k==='_'){ bumpFs(-1); e.preventDefault(); }
  else if(k==='f'||k==='F'){ toggleFull(); e.preventDefault(); }
  else if(k==='d'||k==='D'){ wbToggle(); e.preventDefault(); }
  else if((k==='m'||k==='M')&&document.querySelector('.rail')){ toggleRail(); e.preventDefault(); }
});

function init(){ wbBuild(); buildBar(); applyFs(); slInit(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
