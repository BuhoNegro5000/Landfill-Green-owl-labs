const fs=require('fs'),path=require('path');
function walk(d,out=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','.next','.git'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p,out);else if(/\.tsx$/.test(e.name))out.push(p);}return out;}
const used=new Map();
for(const f of walk(path.join(process.cwd(),'components'))){
  const src=fs.readFileSync(f,'utf8');
  for(const m of src.matchAll(/className=(?:"([^"]*)"|\{cn\(([\s\S]*?)\)\}|\{`([^`]*)`\})/g)){
    const raw=m[1]||m[2]||m[3]||'';
    for(const t of raw.matchAll(/["'`]([^"'`$]*)["'`]/g)){ for(const tok of t[1].split(/\s+/)) if(/^[a-z][a-z0-9-]*$/.test(tok)) used.set(tok,f);}
    for(const tok of raw.split(/\s+/)) if(/^[a-z][a-z0-9-]*$/.test(tok)&&!/^(cn|true|false)$/.test(tok)) used.set(tok,f);
  }
}
const css=fs.readFileSync(path.join(process.cwd(),'app','globals.css'),'utf8');
const defined=new Set(); for(const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(m[1]);
const missing=[...used.entries()].filter(([c])=>!defined.has(c));
console.log('missing', missing.length);
for(const [c,f] of missing) console.log(c, '<-', path.basename(f));
