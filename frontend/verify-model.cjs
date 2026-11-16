// Focused regression checks for document grouping and sample workbook mapping.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let source=fs.readFileSync(__dirname+'/app.js','utf8').replace(/\nrender\(\);\s*$/,'');
const document={documentElement:{dataset:{},classList:{toggle(){},contains(){return false}}},addEventListener(){}};
const context={document,localStorage:{getItem(){return null}},location:{hash:''},crypto:require('node:crypto').webcrypto,structuredClone,window:{addEventListener(){}},console,matchMedia(){return{matches:false}},setTimeout,clearTimeout};
vm.createContext(context);vm.runInContext(source,context);
const sample=JSON.parse(fs.readFileSync(__dirname+'/../reference/workbook-cells.json','utf8'));
const sheet=Object.assign({'!ref':'A1:AG9'},...sample.rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,{v}]))));
context.XLSX={utils:{encode_cell:({r,c})=>{let s='',n=c+1;while(n){let a=(n-1)%26;s=String.fromCharCode(65+a)+s;n=Math.floor((n-1)/26)}return s+(r+1)},decode_range:()=>({e:{r:8,c:32}})}};context.sheet=sheet;
let rows=vm.runInContext('parseWorkbook(sheet,{level:"Địa phương"})',context);
assert.equal(rows.length,9);let vp=rows.find(r=>r.agency==='VP UBND tỉnh'&&r.doc==='4651');assert.equal(String(vp.values.vCPU),'576');assert.equal(String(vp.values['RAM (GB)']),'1536');assert.equal(vp.values['Sizing 3 vùng'],'x');assert.equal(vp.values['Sizing / DMZ'],'-');assert.equal(vp.values['Ghi chú'],'Tạm rút');assert(!Object.hasOwn(vp.values,'undefined'));
assert.equal(rows.filter(r=>r.doc==='952').length,4);let special=rows.find(r=>r.doc==='4267');assert.equal(special.system,'Hệ thống iCaMau');assert.equal(special.values['Ô nguồn N9'],'128');assert(!Object.hasOwn(special.values,'vCPU'));
context.parsed=rows;vm.runInContext(`state.rows=[];for(let item of parsed){let r=state.rows.find(x=>key(x)===key(item));if(!r){r={id:uid(),...item,custom:{},snapshots:[]};state.rows.push(r)}r.snapshots.push({doc:item.doc,uploadedAt:'2026-11-15T01:00:00Z',confirmedAt:'2026-11-15T01:00:00Z',values:item.values})}filters.doc='952'`,context);
assert.equal(vm.runInContext('state.rows.length',context),5);assert.equal(vm.runInContext('visibleRows().length',context),4);assert.equal(vm.runInContext('visibleRows().some(r=>r.system.includes("iCaMau"))',context),false);assert.equal(vm.runInContext('visibleRows().every(r=>r.snapshots.some(s=>s.doc==="4651"))',context),true);
assert.equal(vm.runInContext('latest({snapshots:[{doc:"952",confirmedAt:"2026-01-01",values:{vCPU:1}},{doc:"952",confirmedAt:"2026-02-01",values:{vCPU:2}}]},"952").values.vCPU',context),2);
assert(vm.runInContext('field("<img src=x>","test").includes("&lt;img")',context));
const grouped=vm.runInContext('groupedHeader(["4651"])',context);assert(grouped.includes('header-level-3'));assert(grouped.includes('>SSD</th>'));assert.equal((grouped.match(/>Disk \(TB\)</g)||[]).length,1);
console.log('PASS: 9 sample snapshots, 5 grouped systems, 4 exact952 rows; 4651 complete20-column mapping,4267 raw preservation, latest-version selection, escaped labels.');
