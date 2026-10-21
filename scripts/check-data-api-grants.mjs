import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Deliberately checks the supported SQL style. New quoted/dynamic DDL needs review.
export function checkGrants(root){
 const errors=[];
 const spec=JSON.parse(fs.readFileSync(path.join(root,'supabase/data-api-grants.json'),'utf8'));
 const objects=new Map(spec.relations.map(r=>[r.schema+'.'+r.name,r]));
 const sources=new Map(spec.sourceFiles.map(s=>[s.path,s]));
 const clean=s=>s.replace(/'(?:''|[^'])*'/g,"''").replace(/\/\*[\s\S]*?\*\//g,'').replace(/--[^\n]*/g,'');
 const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.sql')?[path.join(dir,e.name)]:[]):[];
 const files=[...walk(path.join(root,'supabase')), ...fs.readdirSync(root).filter(n=>n.endsWith('.txt')).map(n=>path.join(root,n))];
 for(const file of files){
  const relative=path.relative(root,file).replaceAll('\\','/');
  const sql=fs.readFileSync(file,'utf8');const plain=clean(sql);
  const ident='(?:"(?:[^"\\n]|"")+"|[a-z_][\\w$]*)';
  const ddl=new RegExp('\\bcreate\\s+(?:unlogged\\s+)?(table|sequence)\\s+(?:if\\s+not\\s+exists\\s+)?('+ident+'(?:\\s*\\.\\s*'+ident+')?)','gi');
  const created=[...plain.matchAll(ddl)].map(m=>{
   const parts=m[2].match(/"(?:[^"\n]|"")+"|[a-z_][\w$]*/gi).map(n=>n.startsWith('"')?n.slice(1,-1).replaceAll('""','"'):n.toLowerCase());
   return {kind:m[1].toLowerCase(),name:parts.length===1?'public.'+parts[0]:parts.join('.')};
  }).filter(t=>t.name.startsWith('public.'));
  if(!created.length)continue;
  const source=sources.get(relative);
  if(!source){errors.push(`${relative}: nieuw aanmaakscript zonder gecontroleerde Data API-rechten.`);continue;}
  const block=sql.match(/-- BEGIN EXPLICIT DATA API GRANTS[^\n]*\n([\s\S]*?)-- END EXPLICIT DATA API GRANTS/);
  if(!block){errors.push(`${relative}: expliciete rechten ontbreken.`);continue;}
  const body=clean(block[1]);
  for(const c of created){if(!objects.has(c.name)||!source.objects.includes(c.name.slice(7)))errors.push(`${relative}: ${c.name} ontbreekt in het rechtenoverzicht.`);}
  const expected=[];
  for(const name of source.objects){
   const object=objects.get('public.'+name);
   if(!object){errors.push(`${relative}: onbekend object ${name}.`);continue;}
   if(object.kind==='r')expected.push(`alter table public.${name} enable row level security`);
   for(const [role,privs] of Object.entries(object.grants))if(privs.length)expected.push(`grant ${privs.join(', ')} on ${object.kind==='S'?'sequence':'table'} public.${name} to ${role}`);
  }
  const normalize=s=>s.trim().toLowerCase().replace(/\s+/g,' ').replace(/\s*,\s*/g,',');
  const actual=body.split(';').map(normalize).filter(Boolean).sort();
  const wanted=expected.map(normalize).sort();
  if(JSON.stringify(actual)!==JSON.stringify(wanted))errors.push(`${relative}: rechten wijken af van het gecontroleerde overzicht.`);
 }
 for(const source of spec.sourceFiles)if(!fs.existsSync(path.join(root,source.path)))errors.push(`Ontbrekend aanmaakscript: ${source.path}`);
 return {errors,checkedFiles:spec.sourceFiles.length,checkedObjects:spec.relations.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=checkGrants(path.resolve(process.argv[2]||'.'));
 if(result.errors.length){console.error(result.errors.join('\n'));process.exitCode=1;}
 else console.log(`Data API-rechten gecontroleerd: ${result.checkedFiles} aanmaakscripts, ${result.checkedObjects} vastgelegde objecten.`);
}
