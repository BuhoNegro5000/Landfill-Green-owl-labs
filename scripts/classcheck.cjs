const fs=require('fs'),path=require('path');
const root=process.cwd();
function walk(d,out=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.next','.git'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p,out);else if(/\.(tsx|ts)$/.test(e.name))out.push(p);}return out;}
const files=walk(root);
const used=new Map();
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  const re=/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/g;
  let m;
  while((m=re.exec(src))){
    const raw=m[1]||m[2]||'';
    if(!raw) continue;
    for(const tok of raw.split(/[\s]+/)){ if(!tok||tok.includes('$')||tok.includes('${'))continue; if(/^[a-zA-Z][\w:-]*$/.test(tok)) used.set(tok,(used.get(tok)||0)+1);}
  }
  // string arrays / clsx args
  const re2=/["'`]([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*)+)["'`]/g;
  while((m=re2.exec(src))){ for(const tok of m[1].split(/\s+/)) if(/^[a-z][\w-]*$/.test(tok)) used.set(tok,(used.get(tok)||0)+1); }
}
const css=fs.readFileSync(path.join(root,'app','globals.css'),'utf8');
const defined=new Set();
for(const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(m[1]);
const missing=[...used.keys()].filter(c=>!defined.has(c)).sort();
console.log('used classes:',used.size,'defined:',defined.size,'missing:',missing.length);
console.log(missing.join('\n'));
