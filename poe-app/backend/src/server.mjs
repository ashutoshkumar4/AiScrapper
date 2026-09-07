import cors from 'cors';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dbPath=process.env.POE_DB_PATH||path.join(backendDir,'data','poe_test.db');
const scraperUrl=process.env.POE_API_URL||'http://127.0.0.1:8001/find-poe/';
const pollMs=Number(process.env.POE_POLL_MS||2000);
const taskTimeoutMs=Number(process.env.POE_TIMEOUT_MS||300000);
const port=Number(process.env.POE_PORT||8080);
const app=express();
const db=new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode=WAL');db.exec('PRAGMA busy_timeout=30000');db.exec('PRAGMA synchronous=NORMAL');
db.exec(`CREATE TABLE IF NOT EXISTS poe_search_history(id INTEGER PRIMARY KEY AUTOINCREMENT,reference_number TEXT,request_json TEXT NOT NULL,response_json TEXT,status TEXT NOT NULL,created_at TEXT NOT NULL)`);
db.exec('CREATE INDEX IF NOT EXISTS idx_history_reference ON poe_search_history(reference_number)');db.exec('PRAGMA optimize');

const columnMap={'Reference Number':'reference_number','Hit Indicator':'hit_indicator','Full Name':'full_name','Name Suffix':'name_suffix',Address:'address',City:'city',State:'state','Zip Code':'zip_code','Address Reported Date':'address_reported_date','Employer Name':'employer_name','Employer Occupation':'employer_occupation','Employment Date Verified':'employment_date_verified','Deceased Flag':'deceased_flag'};
const publicColumns=Object.entries(columnMap).map(([source,target])=>`"${source}" AS "${target}"`).join(', ');
app.use(cors({origin:['http://localhost:4200','http://127.0.0.1:4200']}));
app.use(express.json({limit:'1mb'}));

app.get('/api/health',async(_request,response)=>{
  const {count}=db.prepare('SELECT COUNT(*) AS count FROM "POE_Test_Data"').get();
  let scraper='offline';try{const result=await fetch('http://127.0.0.1:8001/docs');if(result.ok)scraper='online';}catch{}
  response.json({status:'ok',database_records:count,scraper,scraper_url:scraperUrl});
});
app.get('/api/records',(request,response)=>{
  const query=String(request.query.q||'').trim();const {count:total}=db.prepare('SELECT COUNT(*) AS count FROM "POE_Test_Data"').get();let records;
  if(query){const term=`%${query}%`;records=db.prepare(`SELECT ${publicColumns} FROM "POE_Test_Data" WHERE "Full Name" LIKE ? OR "City" LIKE ? OR "State" LIKE ? OR "Reference Number" LIKE ? OR "Employer Name" LIKE ? ORDER BY "Full Name" LIMIT 100`).all(term,term,term,term,term);}
  else records=db.prepare(`SELECT ${publicColumns} FROM "POE_Test_Data" ORDER BY "Full Name" LIMIT 100`).all();
  response.json({records,total});
});
app.get('/api/history',(_request,response)=>response.json({history:db.prepare('SELECT id,reference_number,status,created_at FROM poe_search_history ORDER BY id DESC LIMIT 25').all()}));
app.post('/api/find-poe',async(request,response)=>{
  const required=['full_name','zip_code','city','state','country','provider'];const missing=required.filter(key=>!String(request.body?.[key]??'').trim());
  if(missing.length)return response.status(400).json({detail:`Missing required fields: ${missing.join(', ')}`});
  const payload=Object.fromEntries(required.map(key=>[key,request.body[key]]));
  try{
    const acceptedResponse=await fetch(scraperUrl,{method:'POST',headers:{accept:'application/json','content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
    const accepted=await readJson(acceptedResponse);if(!acceptedResponse.ok)throw new UpstreamError(acceptedResponse.status,accepted);if(!accepted.task_id)throw new Error('Scraper did not return a task_id.');
    const taskUrl=`${scraperUrl.replace(/\/$/,'')}/${accepted.task_id}`;const deadline=Date.now()+taskTimeoutMs;let result=accepted;
    while(Date.now()<deadline){await delay(pollMs);const pollResponse=await fetch(taskUrl,{headers:{accept:'application/json'},signal:AbortSignal.timeout(30000)});result=await readJson(pollResponse);if(!pollResponse.ok)throw new UpstreamError(pollResponse.status,result);if(['SUCCESS','FAILURE'].includes(result.status))break;}
    if(!['SUCCESS','FAILURE'].includes(result.status))throw new Error(`Scraper task exceeded ${taskTimeoutMs/1000} seconds.`);
    saveHistory(request.body,result,result.status);return response.status(result.status==='SUCCESS'?200:502).json(result);
  }catch(error){const detail=error instanceof UpstreamError?`Scraper returned HTTP ${error.status}: ${JSON.stringify(error.body).slice(0,500)}`:`Cannot complete the scraper request at ${scraperUrl}: ${error.message}`;saveHistory(request.body,{detail},'FAILED');return response.status(error instanceof UpstreamError?502:503).json({detail});}
});
app.use((_request,response)=>response.status(404).json({detail:'Not found'}));
app.use((error,_request,response,_next)=>{console.error(error);response.status(500).json({detail:'Unexpected backend error.'});});
const server=app.listen(port,'127.0.0.1',()=>{console.log(`POE Express backend: http://127.0.0.1:${port}`);console.log(`SQLite database: ${dbPath}`);console.log(`Scraper API: ${scraperUrl}`);});
process.on('SIGINT',()=>server.close(()=>{db.close();process.exit(0);}));
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function readJson(response){const text=await response.text();try{return JSON.parse(text);}catch{return{detail:text||response.statusText};}}
function saveHistory(input,result,status){db.prepare('INSERT INTO poe_search_history(reference_number,request_json,response_json,status,created_at) VALUES(?,?,?,?,?)').run(input.reference_number??null,JSON.stringify(input),JSON.stringify(result),status,new Date().toISOString());}
class UpstreamError extends Error{constructor(status,body){super(`HTTP ${status}`);this.status=status;this.body=body;}}
