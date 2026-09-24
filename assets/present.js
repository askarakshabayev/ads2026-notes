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
    '<button id="pb-draw" title="Whiteboard (D)">✎</button>'+
    '<button id="pb-full" title="Fullscreen (F)">⛶</button>'+
    '<button id="pb-theme" title="Light / dark">◐</button>';
  body.appendChild(bar);
  document.getElementById('pb-minus').onclick=function(){bumpFs(-1);};
  document.getElementById('pb-plus').onclick=function(){bumpFs(1);};
  document.getElementById('pb-draw').onclick=function(){wbToggle();};
  document.getElementById('pb-full').onclick=toggleFull;
  document.getElementById('pb-theme').onclick=toggleTheme;
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
  if(k==='+'||k==='='){ bumpFs(1); e.preventDefault(); }
  else if(k==='-'||k==='_'){ bumpFs(-1); e.preventDefault(); }
  else if(k==='f'||k==='F'){ toggleFull(); e.preventDefault(); }
  else if(k==='d'||k==='D'){ wbToggle(); e.preventDefault(); }
  else if((k==='m'||k==='M')&&document.querySelector('.rail')){ toggleRail(); e.preventDefault(); }
});

function init(){ wbBuild(); buildBar(); applyFs(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
