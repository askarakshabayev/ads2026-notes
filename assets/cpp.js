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
      acceptSuggestionOnEnter:'off', tabCompletion:'on',
      bracketPairColorization:{enabled:true}, scrollbar:{verticalScrollbarSize:10}
    });
    MON.ed.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.Enter, run);
    MON.ed.onDidChangeModelContent(saveState);
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
  /* Таблица подсказок: [что печатает пользователь, что показать в списке,
     что вставить (синтаксис сниппетов Monaco), пояснение].
     Триггер = filterText, поэтому "stack" находит "stack<int> st;". */
  var T=[
  /* --- контейнеры: сразу готовое объявление --- */
  ['vector','vector<int> a;','vector<${1:int}> ${2:a};','пустой вектор'],
  ['vector','vector<int> a(n);','vector<${1:int}> ${2:a}(${3:n});','вектор заданного размера'],
  ['vector','vector<int> a(n, 0);','vector<${1:int}> ${2:a}(${3:n}, ${4:0});','вектор с заполнением'],
  ['vector','vector<vector<int>> g(n);','vector<vector<${1:int}>> ${2:g}(${3:n});','матрица / список смежности'],
  ['stack','stack<int> st;','stack<${1:int}> ${2:st};','стек'],
  ['queue','queue<int> q;','queue<${1:int}> ${2:q};','очередь'],
  ['deque','deque<int> dq;','deque<${1:int}> ${2:dq};','дек'],
  ['set','set<int> s;','set<${1:int}> ${2:s};','множество'],
  ['multiset','multiset<int> ms;','multiset<${1:int}> ${2:ms};','мультимножество'],
  ['map','map<string, int> m;','map<${1:string}, ${2:int}> ${3:m};','упорядоченный словарь'],
  ['unordered_map','unordered_map<int, int> um;','unordered_map<${1:int}, ${2:int}> ${3:um};','хеш-таблица'],
  ['unordered_set','unordered_set<int> us;','unordered_set<${1:int}> ${2:us};','хеш-множество'],
  ['priority_queue','priority_queue<int> pq;   // max-heap','priority_queue<${1:int}> ${2:pq};','макс-куча (по умолчанию)'],
  ['priority_queue','priority_queue<int, vector<int>, greater<int>> pq;   // min-heap',
   'priority_queue<${1:int}, vector<${1:int}>, greater<${1:int}>> ${2:pq};','мин-куча'],
  ['pair','pair<int, int> p;','pair<${1:int}, ${2:int}> ${3:p};','пара'],
  ['string','string s;','string ${1:s};','строка'],
  ['array','array<int, 10> a{};','array<${1:int}, ${2:10}> ${3:a}{};','массив фиксированного размера'],
  ['struct','struct Node { ... };','struct ${1:Node} {\n\t${2:int value;}\n};','структура'],

  /* --- конструкции языка --- */
  ['for','for (int i = 0; i < n; ++i) { ... }','for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t$0\n}','цикл по индексу'],
  ['for','for (auto &x : a) { ... }','for (auto &${1:x} : ${2:a}) {\n\t$0\n}','range-for по ссылке'],
  ['for','for (int i = 0; i < n; ++i) for (int j = 0; j < m; ++j) { ... }',
   'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\tfor (int ${3:j} = 0; ${3:j} < ${4:m}; ++${3:j}) {\n\t\t$0\n\t}\n}','вложенный цикл'],
  ['for','for (int i = n - 1; i >= 0; --i) { ... }','for (int ${1:i} = ${2:n} - 1; ${1:i} >= 0; --${1:i}) {\n\t$0\n}','цикл в обратную сторону'],
  ['while','while (cond) { ... }','while (${1:condition}) {\n\t$0\n}','цикл с условием'],
  ['while','while (!q.empty()) { ... }','while (!${1:q}.empty()) {\n\t$0\n}','пока очередь не пуста'],
  ['if','if (cond) { ... }','if (${1:condition}) {\n\t$0\n}','условие'],
  ['ifelse','if (cond) { ... } else { ... }','if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}','условие с else'],
  ['main','int main() { ... }','int main() {\n\t$0\n\treturn 0;\n}','точка входа'],
  ['lambda','auto f = [](int x) { ... };','auto ${1:f} = [](${2:int x}) {\n\t$0\n};','лямбда'],
  ['rec','function<int(int)> f = [&](int v) { ... };','function<${1:int}(${2:int})> ${3:f} = [&](${2:int} ${4:v}) {\n\t$0\n};','рекурсивная лямбда'],

  /* --- алгоритмы: целиком, а не одно слово --- */
  ['sort','sort(a.begin(), a.end());','sort(${1:a}.begin(), ${1:a}.end());','сортировка по возрастанию'],
  ['sort','sort(a.begin(), a.end(), greater<int>());','sort(${1:a}.begin(), ${1:a}.end(), greater<${2:int}>());','сортировка по убыванию'],
  ['sort','sort(v.begin(), v.end(), [](...){ ... });','sort(${1:v}.begin(), ${1:v}.end(), [](const auto &a, const auto &b) {\n\treturn $0;\n});','сортировка со своим компаратором'],
  ['stable_sort','stable_sort(a.begin(), a.end());','stable_sort(${1:a}.begin(), ${1:a}.end());','устойчивая сортировка'],
  ['lower_bound','lower_bound(a.begin(), a.end(), x) - a.begin();','lower_bound(${1:a}.begin(), ${1:a}.end(), ${2:x}) - ${1:a}.begin();','первый индекс >= x'],
  ['upper_bound','upper_bound(a.begin(), a.end(), x) - a.begin();','upper_bound(${1:a}.begin(), ${1:a}.end(), ${2:x}) - ${1:a}.begin();','первый индекс > x'],
  ['reverse','reverse(a.begin(), a.end());','reverse(${1:a}.begin(), ${1:a}.end());','развернуть'],
  ['unique','a.erase(unique(a.begin(), a.end()), a.end());','${1:a}.erase(unique(${1:a}.begin(), ${1:a}.end()), ${1:a}.end());','убрать подряд идущие повторы'],
  ['accumulate','accumulate(a.begin(), a.end(), 0LL);','accumulate(${1:a}.begin(), ${1:a}.end(), 0LL);','сумма'],
  ['max_element','*max_element(a.begin(), a.end());','*max_element(${1:a}.begin(), ${1:a}.end());','максимум'],
  ['min_element','*min_element(a.begin(), a.end());','*min_element(${1:a}.begin(), ${1:a}.end());','минимум'],

  /* --- ввод-вывод и заготовки целиком --- */
  ['cin','cin >> x;','cin >> ${1:x};','чтение'],
  ['cout','cout << x << "\\n";','cout << ${1:x} << "\\n";','вывод'],
  ['include','#include <bits/stdc++.h>','#include <bits/stdc++.h>\nusing namespace std;\n$0','заголовок'],
  ['fastio','ios_base::sync_with_stdio(false); cin.tie(nullptr);','ios_base::sync_with_stdio(false);\ncin.tie(nullptr);','быстрый ввод-вывод'],
  ['readvec','int n; cin >> n; vector<int> a(n); ...','int ${1:n};\ncin >> ${1:n};\nvector<int> ${2:a}(${1:n});\nfor (int &x : ${2:a}) cin >> x;\n$0','прочитать n и массив'],
  ['printvec','for (int x : a) cout << x << " ";','for (int x : ${1:a}) cout << x << " ";\ncout << "\\n";','напечатать массив'],
  ['graph','читать граф в список смежности','int ${1:n}, ${2:m};\ncin >> ${1:n} >> ${2:m};\nvector<vector<int>> ${3:g}(${1:n} + 1);\nfor (int i = 0; i < ${2:m}; ++i) {\n\tint u, v; cin >> u >> v;\n\t${3:g}[u].push_back(v);\n\t${3:g}[v].push_back(u);\n}\n$0','чтение неориентированного графа'],
  ['bfs','обход в ширину от вершины s','queue<int> q;\nvector<int> dist(${1:n} + 1, -1);\nq.push(${2:s}); dist[${2:s}] = 0;\nwhile (!q.empty()) {\n\tint v = q.front(); q.pop();\n\tfor (int to : ${3:g}[v]) if (dist[to] == -1) {\n\t\tdist[to] = dist[v] + 1;\n\t\tq.push(to);\n\t}\n}\n$0','BFS с расстояниями'],
  ['dfs','обход в глубину (рекурсивно)','vector<bool> used(${1:n} + 1, false);\nfunction<void(int)> dfs = [&](int v) {\n\tused[v] = true;\n\tfor (int to : ${2:g}[v]) if (!used[to]) dfs(to);\n};\n$0','DFS'],
  ['dsu','система непересекающихся множеств','vector<int> p(${1:n} + 1), sz(${1:n} + 1, 1);\niota(p.begin(), p.end(), 0);\nfunction<int(int)> find = [&](int v) { return p[v] == v ? v : p[v] = find(p[v]); };\nauto unite = [&](int a, int b) {\n\ta = find(a); b = find(b);\n\tif (a == b) return false;\n\tif (sz[a] < sz[b]) swap(a, b);\n\tp[b] = a; sz[a] += sz[b];\n\treturn true;\n};\n$0','СНМ с сжатием путей'],
  ['dijkstra','кратчайшие пути от вершины s','vector<long long> d(${1:n} + 1, LLONG_MAX / 4);\npriority_queue<pair<long long,int>, vector<pair<long long,int>>, greater<>> pq;\nd[${2:s}] = 0; pq.push({0, ${2:s}});\nwhile (!pq.empty()) {\n\tauto [dv, v] = pq.top(); pq.pop();\n\tif (dv > d[v]) continue;\n\tfor (auto [to, w] : ${3:g}[v])\n\t\tif (d[v] + w < d[to]) {\n\t\t\td[to] = d[v] + w;\n\t\t\tpq.push({d[to], to});\n\t\t}\n}\n$0','Дейкстра на куче'],
  ['binsearch','бинпоиск по ответу','long long l = ${1:1}, r = ${2:MAXV};\nwhile (l < r) {\n\tlong long m = l + (r - l + 1) / 2;\n\tif (can(m)) l = m; else r = m - 1;\n}\n$0','максимальный x, для которого can(x)'],
  ['prefixfunc','префикс-функция','vector<int> pi(${1:s}.size(), 0);\nfor (int i = 1; i < (int)${1:s}.size(); ++i) {\n\tint j = pi[i - 1];\n\twhile (j > 0 && ${1:s}[i] != ${1:s}[j]) j = pi[j - 1];\n\tif (${1:s}[i] == ${1:s}[j]) ++j;\n\tpi[i] = j;\n}\n$0','π-массив для KMP']
  ];

  var KW='alignas alignof auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern false float friend goto inline int long mutable namespace new noexcept nullptr operator private protected public return short signed sizeof static static_cast switch template this throw true try typedef typename union unsigned using virtual void volatile'.split(' ');
  var WORDS='begin end size empty push_back pop_back emplace_back front back top push pop insert erase clear resize substr length first second make_pair swap min max abs count find iota fill next_permutation binary_search to_string stoi stoll endl cerr printf scanf getline'.split(' ');

  monaco.languages.registerCompletionItemProvider('cpp',{
    triggerCharacters:['<','.','>',':'],
    provideCompletionItems:function(model,pos){
      var w=model.getWordUntilPosition(pos);
      var range={startLineNumber:pos.lineNumber,endLineNumber:pos.lineNumber,
                 startColumn:w.startColumn,endColumn:w.endColumn};
      var K=monaco.languages.CompletionItemKind, R=monaco.languages.CompletionItemInsertTextRule;
      var out=[];
      /* Если тип уже напечатан ("int ma|") или идёт обращение к члену ("v.pu|"),
         целые объявления предлагать нельзя — получится "int int main()". */
      var before=model.getValueInRange({startLineNumber:pos.lineNumber,startColumn:1,
                                        endLineNumber:pos.lineNumber,endColumn:w.startColumn});
      var afterType=/\b(int|long|short|char|bool|float|double|void|unsigned|signed|auto|const)\s+$/.test(before);
      var afterMember=/(\.|->|::)\s*$/.test(before);
      if(afterType||afterMember){
        WORDS.forEach(function(k){ out.push({label:k,kind:K.Method,insertText:k,range:range,sortText:'0'+k}); });
        if(!afterMember) KW.forEach(function(k){ out.push({label:k,kind:K.Keyword,insertText:k,range:range,sortText:'1'+k}); });
        return {suggestions:out};
      }
      T.forEach(function(t,i){
        out.push({label:t[1], filterText:t[0], kind:K.Snippet, insertText:t[2],
                  insertTextRules:R.InsertAsSnippet, detail:t[3],
                  documentation:{value:'**'+t[3]+'**\n\n```cpp\n'+t[2].replace(/\$\{\d+:([^}]*)\}/g,'$1').replace(/\$\d+/g,'')+'\n```'},
                  range:range, sortText:'0'+String(i).padStart(3,'0')});
      });
      WORDS.forEach(function(k){ out.push({label:k,kind:K.Method,insertText:k,range:range,sortText:'1'+k}); });
      KW.forEach(function(k){ out.push({label:k,kind:K.Keyword,insertText:k,range:range,sortText:'2'+k}); });
      return {suggestions:out};
    }
  });
}
/* ---------- состояние переживает перезагрузку ---------- */
var KEY={code:'ads-cpp-code',stdin:'ads-cpp-stdin',open:'ads-cpp-open'};
var saveTimer=null;
function saveState(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(function(){
    try{
      localStorage.setItem(KEY.code,getCode());
      localStorage.setItem(KEY.stdin,stdin?stdin.value:'');
    }catch(e){}
  },400);
}
function saveOpen(v){ try{ localStorage.setItem(KEY.open,v?'1':'0'); }catch(e){} }
function restoreState(){
  var code=null,inp=null;
  try{ code=localStorage.getItem(KEY.code); inp=localStorage.getItem(KEY.stdin); }catch(e){}
  if(code!==null && code.trim()){ ta.value=code; renumber(); }
  else { ta.value=SKELETON; renumber(); }
  if(inp!==null && stdin) stdin.value=inp;
  return code!==null && code.trim();
}
function wasOpen(){ try{ return localStorage.getItem(KEY.open)==='1'; }catch(e){ return false; } }

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
  saveOpen(ED.open);
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

  ta.addEventListener('input',function(){ renumber(); saveState(); });
  ta.addEventListener('scroll',function(){ nums.scrollTop=ta.scrollTop; });
  ta.addEventListener('keydown',keyHandler);
  stdin.addEventListener('input',saveState);
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

  var restored=restoreState();
  say(restored
    ? '<span class="dim">Код восстановлен после перезагрузки. Ctrl+Enter — запустить.</span>'
    : '<span class="dim">Ctrl+Enter или кнопку Run — чтобы скомпилировать и запустить.</span>');
  setStatus(restored?'восстановлено из прошлой сессии':'готово');
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

function init(){ build(); addButton(); if(wasOpen()) toggle(true); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else setTimeout(init,0);
})();
