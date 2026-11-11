import {mkdir,copyFile,readFile,writeFile,rm,stat,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=resolve(root,'www');
await rm(target,{recursive:true,force:true});
await mkdir(resolve(target,'vendor'),{recursive:true});

for(const file of ['manifest.webmanifest','icon.svg']){
 await copyFile(resolve(root,file),resolve(target,file));
}

const barcodeBundle=resolve(root,'node_modules/html5-qrcode/html5-qrcode.min.js');
if((await stat(barcodeBundle)).size<50000)throw Error('Barcode bundle appears incomplete');
await copyFile(barcodeBundle,resolve(target,'vendor/html5-qrcode.min.js'));

let html=await readFile(resolve(root,'index.html'),'utf8');
const remote='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
if(!html.includes(remote))throw Error('Unable to locate browser barcode dependency');
html=html.replace(remote,'./vendor/html5-qrcode.min.js');

const ocrRoot=resolve(target,'vendor/ocr');
await mkdir(resolve(ocrRoot,'core'),{recursive:true});
await mkdir(resolve(ocrRoot,'lang'),{recursive:true});
await copyFile(resolve(root,'node_modules/tesseract.js/dist/tesseract.min.js'),resolve(ocrRoot,'tesseract.min.js'));
await copyFile(resolve(root,'node_modules/tesseract.js/dist/worker.min.js'),resolve(ocrRoot,'worker.min.js'));
const coreRoot=resolve(root,'node_modules/tesseract.js-core');
const coreFiles=(await readdir(coreRoot)).filter(name=>/^tesseract-core.*\.wasm(\.js)?$/.test(name));
if(coreFiles.length<8)throw Error('Incomplete Tesseract WASM runtime: '+coreFiles.join(', '));
for(const file of coreFiles)await copyFile(resolve(coreRoot,file),resolve(ocrRoot,'core',file));

for(const language of ['rus','eng']){
 const targetLang=resolve(ocrRoot,'lang',language+'.traineddata.gz');
 const url='https://tessdata.projectnaptha.com/4.0.0/'+language+'.traineddata.gz';
 let saved=false;
 for(let attempt=1;attempt<=3&&!saved;attempt++){
  try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),60000);
   let response;
   try{response=await fetch(url,{signal:controller.signal});}finally{clearTimeout(timeout);}
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=new Uint8Array(await response.arrayBuffer());
   if(data.length<1000000||data[0]!==0x1f||data[1]!==0x8b)throw Error('Invalid OCR traineddata '+language);
   await writeFile(targetLang,data);saved=true;
  }catch(error){if(attempt===3)throw new Error('Failed to bundle '+language+' OCR data: '+error.message);}
 }
}
html=html.replace('https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js','./vendor/ocr/tesseract.min.js');

const buildNumber=process.env.GITHUB_RUN_NUMBER||'dev';
if(!/^\d+$/.test(buildNumber)&&buildNumber!=='dev')throw Error('Unexpected Android build number');
const buildMarker='data-build="web"';
if(!html.includes(buildMarker))throw Error('Build label not found');
html=html.replace(buildMarker,'data-build="'+buildNumber+'"');

if(!html.includes('./vendor/html5-qrcode.min.js'))throw Error('Barcode dependency not bundled');
await writeFile(resolve(target,'index.html'),html,'utf8');

console.log('Android web assets prepared in www/ (barcode decoder bundled offline).');
