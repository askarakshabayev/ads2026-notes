/* Редактор C++ для показа на лекции.
   Сайт статический, компилятора на GitHub Pages нет, поэтому сборка удалённая:
   основной — Compiler Explorer (отдельно отдаёт ошибки компиляции),
   резервный — Wandbox. Оба с CORS, ключей не требуют. */
(function(){
"use strict";
var body=document.body, ED={open:false,busy:false};
var ta,stdin,out,status,nums,sel;

var SKELETON =
'#include <bits/stdc++.h>\n'+
'using namespace std;\n'+
'\n'+
'int main() {\n'+
'    \n'+
'    return 0;\n'+
'}\n';

var STARTERS={
 'empty main': SKELETON,
 'read n, then n numbers':
   '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n'+
   '    int n;\n    cin >> n;\n    vector<int> a(n);\n'+
   '    for (int &x : a) cin >> x;\n\n'+
   '    for (int x : a) cout << x << " ";\n    cout << "\\n";\n    return 0;\n}\n',
 'read a string':
   '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n'+
   '    string s;\n    cin >> s;\n    cout << s.size() << "\\n";\n    return 0;\n}\n'
};

/* ---------- обёртка фрагмента лекции в компилируемую программу ---------- */
function wrap(code){
  var c=code.replace(/\s+$/,'');
  if(/\bint\s+main\s*\(/.test(c)){
    if(!/#include/.test(c)) c='#include <bits/stdc++.h>\nusing namespace std;\n\n'+c;
    return c+'\n';
  }
  var indented=c.split('\n').map(function(l){ return l.trim()?'    '+l:l; }).join('\n');
  return '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n'+indented+'\n\n    return 0;\n}\n';
}

/* ---------- запуск ---------- */
function stripAnsi(s){ return String(s).replace(/\u001b\[[0-9;]*[A-Za-z]/g,''); }
function esc(s){ return stripAnsi(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function say(html){ out.innerHTML=html; }
function setStatus(t){ status.textContent=t; }

function joinCE(arr){ return (arr||[]).map(function(x){return x.text;}).join('\n'); }

function runGodbolt(src,inp){
  return fetch('https://godbolt.org/api/compiler/g132/compile',{
    method:'POST',
    headers:{'Content-Type':'application/json','Accept':'application/json'},
    body:JSON.stringify({source:src,lang:'c++',options:{
      userArguments:'-O2 -std=c++17 -fdiagnostics-color=never',
      executeParameters:{stdin:inp,args:[]},
      filters:{execute:true},
      compilerOptions:{executorRequest:true}}})
  }).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(d){
      var build=d.buildResult||{};
      if(build.code&&build.code!==0)
        return {ok:false,phase:'compile',text:joinCE(build.stderr)||'compilation failed',engine:'Compiler Explorer'};
      return {ok:true,stdout:joinCE(d.stdout),stderr:joinCE(d.stderr),
              code:d.code,timedOut:d.timedOut,ms:d.execTime,engine:'Compiler Explorer (g++ 13.2, -O2, C++17)'};
    });
}

function runWandbox(src,inp){
  return fetch('https://wandbox.org/api/compile.json',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({compiler:'gcc-13.2.0',code:src,stdin:inp,options:'warning,gnu++17',"compiler-option-raw":"-fdiagnostics-color=never"})
  }).then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
    .then(function(d){
      if(d.compiler_error&&!d.program_output&&d.status!=='0')
        return {ok:false,phase:'compile',text:d.compiler_error,engine:'Wandbox'};
      return {ok:true,stdout:d.program_output||'',stderr:d.program_error||'',
              code:+d.status,engine:'Wandbox (gcc 13.2, C++17)'};
    });
}

function run(){
  if(ED.busy) return;
  ED.busy=true;
  var src=ta.value, inp=stdin.value;
  say('<span class="dim">compiling…</span>');
  setStatus('отправлено на удалённый компилятор…');
  var t0=Date.now();
  runGodbolt(src,inp)
    .catch(function(e){ setStatus('Compiler Explorer недоступен ('+e.message+'), пробую Wandbox…'); return runWandbox(src,inp); })
    .then(function(r){
      var dt=Date.now()-t0;
      if(!r.ok){
        say('<span class="err">'+esc(r.text)+'</span>');
        setStatus('ошибка компиляции · '+r.engine+' · '+dt+' ms');
        return;
      }
      var h='';
      if(r.stdout) h+=esc(r.stdout);
      if(r.stderr) h+=(h?'\n':'')+'<span class="err">'+esc(r.stderr)+'</span>';
      if(r.timedOut) h+=(h?'\n':'')+'<span class="err">— превышено время выполнения —</span>';
      if(!h) h='<span class="dim">(пустой вывод)</span>';
      say(h);
      var vc = (r.code===0||r.code===undefined) ? '<span class="ok">exit 0</span>' : 'exit '+r.code;
      setStatus(r.engine+' · '+dt+' ms'+(r.ms?' (запуск '+r.ms+' ms)':'')+' · код возврата '+(r.code===undefined?0:r.code));
    })
    .catch(function(e){
      say('<span class="err">Не удалось скомпилировать: '+esc(e.message)+
          '</span>\n\n<span class="dim">Оба компилятора недоступны. Это внешний сервис — проверь сеть или брандмауэр аудитории.\n'+
          'Редактор продолжает работать для показа кода.</span>');
      setStatus('сеть недоступна');
    })
    .then(function(){ ED.busy=false; });
}

/* ---------- редактор ---------- */
function renumber(){
  var n=ta.value.split('\n').length, s='';
  for(var i=1;i<=n;i++) s+=i+'\n';
  nums.textContent=s;
  nums.scrollTop=ta.scrollTop;
}
function keyHandler(e){
  if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); run(); return; }
  if(e.key==='Tab'){
    e.preventDefault();
    var s=ta.selectionStart,en=ta.selectionEnd;
    ta.value=ta.value.slice(0,s)+'    '+ta.value.slice(en);
    ta.selectionStart=ta.selectionEnd=s+4; renumber(); return;
  }
  if(e.key==='Enter'){
    var p=ta.selectionStart, line=ta.value.slice(0,p).split('\n').pop();
    var ind=(line.match(/^[ \t]*/)||[''])[0];
    if(/[{(]\s*$/.test(line)) ind+='    ';
    e.preventDefault();
    ta.value=ta.value.slice(0,p)+'\n'+ind+ta.value.slice(ta.selectionEnd);
    ta.selectionStart=ta.selectionEnd=p+1+ind.length; renumber();
  }
}

function load(code,label){
  ta.value=code; renumber();
  setStatus(label?('загружено: '+label):'готово');
  say('<span class="dim">Ctrl+Enter или кнопку Run — чтобы скомпилировать и запустить.</span>');
}

function toggle(on){
  ED.open = (on===undefined)? !ED.open : on;
  body.classList.toggle('ed-on',ED.open);
  var b=document.getElementById('pb-code'); if(b) b.classList.toggle('on',ED.open);
  if(ED.open) setTimeout(function(){ ta.focus(); },30);
}

/* ---------- сборка интерфейса ---------- */
function build(){
  var w=document.createElement('div'); w.className='ed-wrap';
  w.innerHTML=
   '<div class="ed-panel">'+
    '<div class="ed-head">'+
      '<span class="ttl">C++</span>'+
      '<button class="pri" id="ed-run">▶ Run <span style="opacity:.7">Ctrl+↵</span></button>'+
      '<select id="ed-snip"><option value="">— код со страницы —</option></select>'+
      '<button id="ed-reset">Skeleton</button>'+
      '<button id="ed-copy">Copy</button>'+
      '<span class="grow"></span>'+
      '<button id="ed-close">✕ Close</button>'+
    '</div>'+
    '<div class="ed-body">'+
      '<div class="ed-col">'+
        '<div class="ed-lbl">source</div>'+
        '<div class="ed-code"><div class="ed-nums" id="ed-nums">1</div>'+
        '<textarea class="ed-ta" id="ed-ta" spellcheck="false" autocomplete="off"></textarea></div>'+
      '</div>'+
      '<div class="ed-col">'+
        '<div class="ed-lbl">stdin — входные данные</div>'+
        '<textarea class="ed-stdin" id="ed-stdin" spellcheck="false" placeholder="5&#10;4 1 5 2 3"></textarea>'+
        '<div class="ed-lbl">output</div>'+
        '<pre class="ed-out" id="ed-out"></pre>'+
        '<div class="ed-status" id="ed-status">готово</div>'+
      '</div>'+
    '</div>'+
   '</div>';
  body.appendChild(w);

  ta=document.getElementById('ed-ta'); stdin=document.getElementById('ed-stdin');
  out=document.getElementById('ed-out'); status=document.getElementById('ed-status');
  nums=document.getElementById('ed-nums'); sel=document.getElementById('ed-snip');

  ta.addEventListener('input',renumber);
  ta.addEventListener('scroll',function(){ nums.scrollTop=ta.scrollTop; });
  ta.addEventListener('keydown',keyHandler);
  stdin.addEventListener('keydown',function(e){ if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();} });
  document.getElementById('ed-run').onclick=run;
  document.getElementById('ed-close').onclick=function(){ toggle(false); };
  document.getElementById('ed-copy').onclick=function(){
    navigator.clipboard&&navigator.clipboard.writeText(ta.value).then(function(){ setStatus('скопировано в буфер'); });
  };
  document.getElementById('ed-reset').onclick=function(){ load(SKELETON,'skeleton'); };

  /* список: стартовые заготовки + все блоки кода этой страницы */
  var opts='<option value="">— код со страницы —</option>';
  Object.keys(STARTERS).forEach(function(k,i){ opts+='<option value="s'+i+'">'+k+'</option>'; });
  var pres=[].slice.call(document.querySelectorAll('.card pre'));
  pres.forEach(function(pre,i){
    var first=(pre.textContent||'').split('\n').filter(function(l){return l.trim();})[0]||'code';
    opts+='<option value="p'+i+'">'+(i+1)+'. '+first.trim().slice(0,46).replace(/</g,'&lt;')+'</option>';
  });
  sel.innerHTML=opts;
  sel.onchange=function(){
    var v=sel.value; if(!v) return;
    if(v[0]==='s'){ var k=Object.keys(STARTERS)[+v.slice(1)]; load(STARTERS[k],k); }
    else { var pre=pres[+v.slice(1)]; load(wrap(pre.textContent),'блок '+(+v.slice(1)+1)+' со страницы'); }
    sel.value='';
  };

  /* кнопка на каждом блоке кода */
  pres.forEach(function(pre){
    var b=document.createElement('button');
    b.className='pre-run'; b.type='button'; b.textContent='▶ edit & run';
    b.onclick=function(e){ e.stopPropagation(); load(wrap(pre.textContent),'блок со страницы'); toggle(true); };
    pre.appendChild(b);
  });

  load(SKELETON);
}

/* ---------- кнопка в панели показа ---------- */
function addButton(){
  var bar=document.querySelector('.pbar'); if(!bar) return;
  var b=document.createElement('button');
  b.id='pb-code'; b.title='C++ editor (C)'; b.textContent='</>';
  b.style.fontSize='.72rem';
  b.onclick=function(){ toggle(); };
  var draw=document.getElementById('pb-draw');
  if(draw) bar.insertBefore(b,draw); else bar.appendChild(b);
}

document.addEventListener('keydown',function(e){
  var t=e.target.tagName;
  if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||e.metaKey||e.ctrlKey||e.altKey) return;
  if(e.key==='Escape'&&ED.open){ toggle(false); e.preventDefault(); return; }
  if(e.key==='c'||e.key==='C'){ toggle(); e.preventDefault(); }
});

function init(){ build(); addButton(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else setTimeout(init,0);
})();
