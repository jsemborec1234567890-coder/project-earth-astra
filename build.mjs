import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const bundle=await build({entryPoints:['src/main.js'],bundle:true,write:false,minify:true,format:'iife',loader:{'.jpg':'dataurl','.png':'dataurl'},target:'es2020'});
const credits=await readFile('ASSET_CREDITS.md','utf8'),license=await readFile('assets/THREE-GLOBE-LICENSE.txt','utf8'),threeLicense=await readFile('node_modules/three/LICENSE','utf8');
const html=(await readFile('src/index.html','utf8')).replace('</head>',`<!--\n${credits}\n${license}\n${threeLicense}\n--></head>`),css=await readFile('src/style.css','utf8');
await mkdir('dist',{recursive:true});
await writeFile('dist/earth.html',html.replace('/*STYLE*/',css).replace('/*SCRIPT*/',()=>bundle.outputFiles[0].text.replaceAll('</script','<\\/script')));
console.log('Built dist/earth.html — '+( (await readFile('dist/earth.html')).length/1048576).toFixed(2)+' MB, all assets embedded');

