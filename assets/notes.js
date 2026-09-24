/* Общее для всех лекций ADS 2026: переключатель темы, подсветка текущего
   пункта в rail и форматирование чисел. Демо каждой лекции лежат в её файле
   и могут пользоваться window.NOTES.* */
(function(){
"use strict";

/* ---------- theme ---------- */
var root=document.documentElement;
var tb=document.getElementById('themeBtn');
if(tb) tb.addEventListener('click',function(){
  var cur=root.getAttribute('data-theme');
  if(!cur){
    var darkNow=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
    cur=darkNow?'dark':'light';
  }
  var next=cur==='dark'?'light':'dark';
  root.setAttribute('data-theme',next);
  try{ localStorage.setItem('ads-theme',next); }catch(e){}
});
try{ var saved=localStorage.getItem('ads-theme'); if(saved) root.setAttribute('data-theme',saved); }catch(e){}

/* ---------- scroll spy ---------- */
var links={};
Array.prototype.forEach.call(document.querySelectorAll('.rail a'),function(a){
  var h=a.getAttribute('href')||'';
  if(h.charAt(0)==='#') links[h.slice(1)]=a;
});
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      var a=links[e.target.id];
      if(!a)return;
      if(e.isIntersecting){
        Object.keys(links).forEach(function(k){links[k].classList.remove('on');});
        a.classList.add('on');
      }
    });
  },{rootMargin:'-15% 0px -70% 0px',threshold:0});
  Array.prototype.forEach.call(document.querySelectorAll('.beat'),function(s){io.observe(s);});
}

/* ---------- formatting helpers ---------- */
function grp(x){ return x.toLocaleString('en-US').replace(/,/g,' '); }
function sci(x){
  if(!isFinite(x))return'∞';
  if(x<1e6)return grp(Math.round(x));
  var e=Math.floor(Math.log10(x));
  var m=x/Math.pow(10,e);
  return m.toFixed(2)+' × 10^'+e;
}
function dur(sec){
  if(!isFinite(sec))return'forever';
  if(sec<1e-6)return (sec*1e9).toFixed(1)+' ns';
  if(sec<1e-3)return (sec*1e6).toFixed(1)+' µs';
  if(sec<1)    return (sec*1e3).toFixed(1)+' ms';
  if(sec<60)   return sec.toFixed(2)+' s';
  if(sec<3600) return (sec/60).toFixed(1)+' min';
  if(sec<86400)return (sec/3600).toFixed(1)+' h';
  if(sec<3.15e7)return (sec/86400).toFixed(1)+' days';
  return sci(sec/3.15e7)+' years';
}
function parseBig(s){ try{ var v=BigInt(String(s).replace(/[\s_]/g,'')); return v>0n?v:null; }catch(e){ return null; } }
function el(id){ return document.getElementById(id); }
function on(id,ev,fn){ var e=el(id); if(e) e.addEventListener(ev,fn); }
function each(sel,fn){ Array.prototype.forEach.call(document.querySelectorAll(sel),fn); }

window.NOTES={grp:grp,sci:sci,dur:dur,parseBig:parseBig,el:el,on:on,each:each};
})();
