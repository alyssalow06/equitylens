// Resolved by Vite at build time to the hashed worker URL in dist/
const PDFJS_WORKER_SRC = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

// pdfjs-dist v5 creates workers with {type:'module'}, so the blob below is
// treated as an ES module. Polyfills must run before the pdfjs import executes.
const WORKER_POLYFILLS = `
if(!Array.prototype.at){const _a=function(n){const i=(n=Math.trunc(n)||0)<0?this.length+n:n;return i>=0&&i<this.length?this[i]:void 0};Object.defineProperty(Array.prototype,'at',{value:_a,configurable:!0,writable:!0});Object.defineProperty(String.prototype,'at',{value:_a,configurable:!0,writable:!0})}
if(!String.prototype.replaceAll){Object.defineProperty(String.prototype,'replaceAll',{configurable:!0,writable:!0,value:function(s,r){if(s instanceof RegExp){if(!s.global)throw new TypeError('replaceAll: non-global RegExp');return this.replace(s,r)}s=String(s);if(typeof r!='function')return this.split(s).join(String(r));let res='',str=String(this),i=0;for(;;){const f=str.indexOf(s,i);if(f<0){res+=str.slice(i);break}res+=str.slice(i,f)+r(s,f,str);i=f+(s.length||1)}return res}})}
if(!Object.hasOwn)Object.hasOwn=function(o,k){return Object.prototype.hasOwnProperty.call(o,k)};
if(typeof structuredClone=='undefined'){const g=typeof globalThis!='undefined'?globalThis:typeof self!='undefined'?self:this;g.structuredClone=function(v){return JSON.parse(JSON.stringify(v))}}
if(!Array.prototype.findLast){Object.defineProperty(Array.prototype,'findLast',{configurable:!0,writable:!0,value:function(fn,ctx){for(let i=this.length-1;i>=0;i--)if(fn.call(ctx,this[i],i,this))return this[i]}})}
if(!Array.prototype.findLastIndex){Object.defineProperty(Array.prototype,'findLastIndex',{configurable:!0,writable:!0,value:function(fn,ctx){for(let i=this.length-1;i>=0;i--)if(fn.call(ctx,this[i],i,this))return i;return -1}})}
`

function makePolyfillWorkerSrc(realSrc) {
  const blob = new Blob(
    [`${WORKER_POLYFILLS}\nimport "${realSrc}"\n`],
    { type: 'application/javascript' }
  )
  return URL.createObjectURL(blob)
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
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
      const pageText = content.items.map((item) => item.str).join(' ')
      fileText += `\n--- Page ${i} ---\n${pageText}`
    }

    fullText += `\n\n========================================\nDOCUMENT: ${file.name}\n========================================\n${fileText}`
  }

  return { text: fullText.slice(0, 60000) }
}
