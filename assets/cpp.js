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

/* ---------- Monaco (редактор из VS Code), грузится лениво при первом открытии ---------- */
var MON={base:'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/',ed:null,loading:null,failed:false};

function monacoTheme(){
  var d=document.documentElement.getAttribute('data-theme');
  if(!d) d=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';
  return d==='dark'?'ads-dark':'ads-light';
}
function monacoFontSize(){
  var px=parseFloat(getComputedStyle(document.documentElement).fontSize)||16;
  return Math.round(px*0.92);
}
function loadScript(src){
  return new Promise(function(res,rej){
    var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=function(){rej(new Error('не загрузился '+src));};
    document.head.appendChild(s);
  });
}
function ensureMonaco(){
  if(MON.ed) return Promise.resolve(MON.ed);
  if(MON.failed) return Promise.reject(new Error('monaco unavailable'));
  if(MON.loading) return MON.loading;
  setStatus('загружаю редактор (Monaco, ~3 МБ, один раз)…');
  var link=document.createElement('link');
  link.rel='stylesheet'; link.href=MON.base+'editor/editor.main.css';
  document.head.appendChild(link);
  window.MonacoEnvironment={ getWorkerUrl:function(){
    return URL.createObjectURL(new Blob([
      "self.MonacoEnvironment={baseUrl:'"+MON.base+"'};importScripts('"+MON.base+"base/worker/workerMain.js');"
    ],{type:'text/javascript'}));
  }};
  MON.loading=loadScript(MON.base+'loader.js').then(function(){
    return new Promise(function(res,rej){
      window.require.config({paths:{vs:MON.base.replace(/\/$/,'')}});
      window.require(['vs/editor/editor.main'],function(){ res(window.monaco); },rej);
      setTimeout(function(){ rej(new Error('таймаут загрузки')); },30000);
    });
  }).then(function(monaco){
    defineThemes(monaco); registerCpp(monaco);
    var host=document.getElementById('ed-mon');
    document.getElementById('ed-code-plain').style.display='none';
    host.style.display='block';
    MON.ed=monaco.editor.create(host,{
      value:ta.value, language:'cpp', theme:monacoTheme(),
      fontSize:monacoFontSize(), fontFamily:'"IBM Plex Mono", ui-monospace, monospace',
      fontLigatures:false, minimap:{enabled:false}, automaticLayout:true,
      scrollBeyondLastLine:false, tabSize:4, insertSpaces:true, renderWhitespace:'none',
      smoothScrolling:true, cursorBlinking:'smooth', padding:{top:10,bottom:10},
      suggestOnTriggerCharacters:true, quickSuggestions:{other:true,comments:false,strings:false},
      bracketPairColorization:{enabled:true}, scrollbar:{verticalScrollbarSize:10}
    });
    MON.ed.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.Enter, run);
    setStatus('редактор готов · подсветка и автодополнение включены');
    return MON.ed;
  }).catch(function(e){
    MON.failed=true; MON.loading=null;
    setStatus('Monaco не загрузился ('+e.message+') — работает простой редактор');
    throw e;
  });
  return MON.loading;
}
function defineThemes(monaco){
  var cs=getComputedStyle(document.documentElement);
  function v(n,f){ return (cs.getPropertyValue(n)||f).trim().replace(/^#?/,'#'); }
  monaco.editor.defineTheme('ads-light',{base:'vs',inherit:true,rules:[],
    colors:{'editor.background':'#f6f8fa','editorLineNumber.foreground':'#8091a5'}});
  monaco.editor.defineTheme('ads-dark',{base:'vs-dark',inherit:true,rules:[],
    colors:{'editor.background':'#1a2230','editorLineNumber.foreground':'#6c7a8c'}});
}
function registerCpp(monaco){
  var KW='alignas alignof and auto bool break case catch char class const constexpr continue decltype default delete do double else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public return short signed sizeof static static_cast struct switch template this throw true try typedef typename union unsigned using virtual void volatile while'.split(' ');
  var STL='vector map set unordered_map unordered_set multiset multimap priority_queue queue stack deque string pair tuple array bitset sort stable_sort lower_bound upper_bound binary_search reverse unique accumulate max_element min_element next_permutation fill iota count find swap min max abs push_back pop_back emplace_back size empty begin end front back top push pop insert erase clear resize substr length first second make_pair cin cout cerr endl printf scanf getline to_string stoi stoll'.split(' ');
  var SNIP=[
   ['main','int main() {\n\t$0\n\treturn 0;\n}','полный main'],
   ['fastio','ios_base::sync_with_stdio(false);\ncin.tie(nullptr);','быстрый ввод-вывод'],
   ['forn','for (int ${1:i} = 0; $1 < ${2:n}; ++$1) {\n\t$0\n}','цикл по индексу'],
   ['fore','for (auto &${1:x} : ${2:a}) {\n\t$0\n}','range-for по ссылке'],
   ['readvec','int n;\ncin >> n;\nvector<int> a(n);\nfor (int &x : a) cin >> x;\n$0','прочитать n и массив'],
   ['printvec','for (int x : ${1:a}) cout << x << " ";\ncout << "\\n";','напечатать массив'],
   ['sortdesc','sort(${1:a}.begin(), $1.end(), greater<int>());','сортировка по убыванию'],
   ['cmp','sort(${1:v}.begin(), $1.end(), [](const auto &x, const auto &y) {\n\treturn $0;\n});','сортировка с компаратором'],
   ['minheap','priority_queue<int, vector<int>, greater<int>> pq;','мин-куча'],
   ['dsu','vector<int> p(n), sz(n, 1);\niota(p.begin(), p.end(), 0);\nfunction<int(int)> find = [&](int v) { return p[v] == v ? v : p[v] = find(p[v]); };\n$0','СНМ'],
   ['bfs','queue<int> q;\nvector<int> dist(n + 1, -1);\nq.push(s); dist[s] = 0;\nwhile (!q.empty()) {\n\tint v = q.front(); q.pop();\n\tfor (int to : g[v]) if (dist[to] == -1) {\n\t\tdist[to] = dist[v] + 1;\n\t\tq.push(to);\n\t}\n}\n$0','обход в ширину'],
   ['graph','int n, m;\ncin >> n >> m;\nvector<vector<int>> g(n + 1);\nfor (int i = 0; i < m; ++i) {\n\tint u, v; cin >> u >> v;\n\tg[u].push_back(v);\n\tg[v].push_back(u);\n}\n$0','прочитать граф']
  ];
  monaco.languages.registerCompletionItemProvider('cpp',{
    provideCompletionItems:function(model,pos){
      var w=model.getWordUntilPosition(pos);
      var range={startLineNumber:pos.lineNumber,endLineNumber:pos.lineNumber,startColumn:w.startColumn,endColumn:w.endColumn};
      var K=monaco.languages.CompletionItemKind, R=monaco.languages.CompletionItemInsertTextRule;
      var out=[];
      SNIP.forEach(function(s){ out.push({label:s[0],kind:K.Snippet,insertText:s[1],
        insertTextRules:R.InsertAsSnippet,detail:s[2],documentation:s[2],range:range,sortText:'0'+s[0]}); });
      STL.forEach(function(k){ out.push({label:k,kind:K.Function,insertText:k,range:range,sortText:'1'+k}); });
      KW.forEach(function(k){ out.push({label:k,kind:K.Keyword,insertText:k,range:range,sortText:'2'+k}); });
      return {suggestions:out};
    }
  });
}
function getCode(){ return MON.ed ? MON.ed.getValue() : ta.value; }
function setCode(c){ if(MON.ed) MON.ed.setValue(c); else { ta.value=c; renumber(); } }
function syncMonaco(){
  if(!MON.ed) return;
  MON.ed.updateOptions({fontSize:monacoFontSize()});
  window.monaco&&window.monaco.editor.setTheme(monacoTheme());
  MON.ed.layout();
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
  var src=getCode(), inp=stdin.value;
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
  setCode(code);
  setStatus(label?('загружено: '+label):'готово');
  say('<span class="dim">Ctrl+Enter или кнопку Run — чтобы скомпилировать и запустить.</span>');
}

function toggle(on){
  ED.open = (on===undefined)? !ED.open : on;
  body.classList.toggle('ed-on',ED.open);
  var b=document.getElementById('pb-code'); if(b) b.classList.toggle('on',ED.open);
  if(ED.open){
    ensureMonaco().then(function(ed){ syncMonaco(); ed.focus(); })
                  .catch(function(){ setTimeout(function(){ ta.focus(); },30); });
  }
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
        '<div class="ed-code" id="ed-code-plain"><div class="ed-nums" id="ed-nums">1</div>'+
        '<textarea class="ed-ta" id="ed-ta" spellcheck="false" autocomplete="off"></textarea></div>'+
        '<div class="ed-mon" id="ed-mon"></div>'+
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
    navigator.clipboard&&navigator.clipboard.writeText(getCode()).then(function(){ setStatus('скопировано в буфер'); });
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

/* масштаб A+/A− и переключение темы должны докатываться до Monaco */
(function(){
  var mo=new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      var a=muts[i].attributeName;
      if(a==='style'||a==='data-theme'){ syncMonaco(); break; }
    }
  });
  mo.observe(document.documentElement,{attributes:true,attributeFilter:['style','data-theme']});
  if(window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',syncMonaco);
})();

function init(){ build(); addButton(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else setTimeout(init,0);
})();
