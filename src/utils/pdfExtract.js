// Resolved by Vite at build time → hashed URL copied into dist/
const PDFJS_WORKER_SRC = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString()

// pdfjs-dist v3 creates classic workers (new Worker(url), no {type:'module'}),
// so we can use importScripts inside the blob to load the real worker after
// polyfilling the missing runtime APIs.
function makePolyfillWorkerSrc(realSrc) {
  const polyfills = `
if(!Array.prototype.at){var _at=function(n){var i=(n=Math.trunc(n)||0)<0?this.length+n:n;return i>=0&&i<this.length?this[i]:undefined};Array.prototype.at=_at;String.prototype.at=_at;}
if(!String.prototype.replaceAll){String.prototype.replaceAll=function(s,r){if(s instanceof RegExp){if(!s.global)throw new TypeError('replaceAll needs global RegExp');return this.replace(s,r)}s=String(s);if(typeof r!=='function')return this.split(s).join(String(r));var res='',str=String(this),i=0;for(;;){var f=str.indexOf(s,i);if(f<0){res+=str.slice(i);break}res+=str.slice(i,f)+r(s,f,str);i=f+(s.length||1)}return res};}
if(!Object.hasOwn)Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k);};
if(typeof structuredClone==='undefined'){var _g=typeof globalThis!=='undefined'?globalThis:typeof self!=='undefined'?self:this;_g.structuredClone=function(v){return JSON.parse(JSON.stringify(v));};}
if(!Array.prototype.findLast){Array.prototype.findLast=function(fn,ctx){for(var i=this.length-1;i>=0;i--)if(fn.call(ctx,this[i],i,this))return this[i];};Array.prototype.findLastIndex=function(fn,ctx){for(var i=this.length-1;i>=0;i--)if(fn.call(ctx,this[i],i,this))return i;return -1;};}
importScripts(${JSON.stringify(realSrc)});
`
  return URL.createObjectURL(new Blob([polyfills], { type: 'application/javascript' }))
}

function readFileAsArrayBuffer(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader()
    reader.onload = function () { resolve(reader.result) }
    reader.onerror = function () { reject(reader.error) }
    reader.readAsArrayBuffer(file)
  })
}

export async function extractMultiplePDFs(files) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = makePolyfillWorkerSrc(PDFJS_WORKER_SRC)

  let fullText = ''

  for (const file of files) {
    const arrayBuffer = await readFileAsArrayBuffer(file)
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fileText = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map(function (item) { return item.str }).join(' ')
      fileText += '\n--- Page ' + i + ' ---\n' + pageText
    }

    fullText += '\n\n========================================\nDOCUMENT: ' + file.name + '\n========================================\n' + fileText
  }

  return { text: fullText.slice(0, 60000) }
}
