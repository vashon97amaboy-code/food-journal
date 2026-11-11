import {mkdir,copyFile,readFile,writeFile,rm,stat} from 'node:fs/promises';
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
if(!html.includes('./vendor/html5-qrcode.min.js'))throw Error('Barcode dependency not bundled');
await writeFile(resolve(target,'index.html'),html,'utf8');

console.log('Android web assets prepared in www/ (barcode decoder bundled offline).');
