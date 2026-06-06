// Runtime polyfills for Safari < 15.4
// Imported first in main.jsx so all app code sees these globals.

// Array.prototype.at / String.prototype.at — Safari < 15.4
if (!Array.prototype.at) {
  const _at = function (index) {
    const n = Math.trunc(index) || 0
    const i = n < 0 ? this.length + n : n
    return i >= 0 && i < this.length ? this[i] : undefined
  }
  Object.defineProperty(Array.prototype,  'at', { value: _at, configurable: true, writable: true })
  Object.defineProperty(String.prototype, 'at', { value: _at, configurable: true, writable: true })
}

// String.prototype.replaceAll — Safari < 13.1
if (!String.prototype.replaceAll) {
  Object.defineProperty(String.prototype, 'replaceAll', {
    configurable: true,
    writable: true,
    value: function replaceAll(search, replacement) {
      if (search instanceof RegExp) {
        if (!search.global) throw new TypeError('replaceAll requires a global RegExp')
        return this.replace(search, replacement)
      }
      const s = String(search)
      if (typeof replacement !== 'function') return this.split(s).join(String(replacement))
      let result = '', str = String(this), i = 0
      for (;;) {
        const f = str.indexOf(s, i)
        if (f < 0) { result += str.slice(i); break }
        result += str.slice(i, f) + replacement(s, f, str)
        i = f + (s.length || 1)
      }
      return result
    },
  })
}

// Object.hasOwn — Safari < 15.4
if (!Object.hasOwn) {
  Object.hasOwn = function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key)
  }
}

// structuredClone — Safari < 15.4
if (typeof structuredClone === 'undefined') {
  const g = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window
  g.structuredClone = function structuredClone(val) {
    return JSON.parse(JSON.stringify(val))
  }
}

// Array.prototype.findLast / findLastIndex — Safari < 16.0
if (!Array.prototype.findLast) {
  Object.defineProperty(Array.prototype, 'findLast', {
    configurable: true,
    writable: true,
    value: function findLast(predicate, thisArg) {
      for (let i = this.length - 1; i >= 0; i--)
        if (predicate.call(thisArg, this[i], i, this)) return this[i]
      return undefined
    },
  })
}
if (!Array.prototype.findLastIndex) {
  Object.defineProperty(Array.prototype, 'findLastIndex', {
    configurable: true,
    writable: true,
    value: function findLastIndex(predicate, thisArg) {
      for (let i = this.length - 1; i >= 0; i--)
        if (predicate.call(thisArg, this[i], i, this)) return i
      return -1
    },
  })
}
