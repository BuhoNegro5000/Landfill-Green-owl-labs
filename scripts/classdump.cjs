const fs=require('fs');
const files=["components/modules/Sensibilidad.tsx","components/modules/Resultados.tsx","components/modules/Informes.tsx","components/modules/Metodos.tsx","components/modules/Normativa.tsx","components/modules/Configuracion.tsx","components/modules/Inicio.tsx","components/modules/Emplazamiento.tsx","components/modules/Modelo.tsx","components/modules/Celdas.tsx","components/modules/Capacidad.tsx","components/modules/Residuos.tsx","components/modules/Lixiviados.tsx","components/modules/Biogas.tsx","components/modules/Operacion.tsx","components/modules/Geotecnia.tsx","components/modules/Clausura.tsx","components/modules/Escenarios.tsx","components/shell/SceneDock.tsx","components/shell/Dialogs.tsx","components/shell/AppShell.tsx","components/Splash.tsx"];
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  const set=new Set();
  for(const m of src.matchAll(/className=(?:"([^"]*)"|\{cn\(([^)]*)\)|\{`([^`]*)`\})/g)){
    const raw=m[1]||m[2]||m[3]||'';
    for(const t of raw.matchAll(/["'`]([^"'`$]+)["'`]/g)){ for(const tok of t[1].split(/\s+/)) if(/^[a-z][a-z0-9-]*$/.test(tok)) set.add(tok); }
    for(const tok of raw.split(/\s+/)) if(/^[a-z][a-z0-9-]*$/.test(tok) && !/^(cn|true|false)$/.test(tok)) set.add(tok);
  }
  console.log('\n## '+f+'\n'+[...set].sort().join(' '));
}
