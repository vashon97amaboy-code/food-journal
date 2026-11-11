import {mkdir,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const target=resolve(root,'www');
await rm(target,{recursive:true,force:true});
await mkdir(target,{recursive:true});
for(const file of ['index.html','manifest.webmanifest','icon.svg'])await copyFile(resolve(root,file),resolve(target,file));
// Android WebView bundles these resources locally; don't install the PWA service worker.
console.log('Android web assets prepared in www/');
