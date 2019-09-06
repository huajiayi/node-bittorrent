const crypto = require('crypto')

const utils = {
  sha1: message => crypto.createHash('sha1').update(message).digest(),
  md5: message => crypto.createHash('md5').update(message).digest(),
  randomString: len => {
    len = len || 5
    let chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijklmnopqrstuvwxyz12345678'
    let charLen = chars.length
    let str = ''
    for (let i = 0; i < len; i++) {
      str += chars.charAt(Math.floor(Math.random() * charLen))
    }

    return str
  },
  randomBytes: () => crypto.randomBytes(20),
  toBuffer: str => {
    if (Buffer.isBuffer(str)) return str
    if (ArrayBuffer.isView(str)) return Buffer.from(str.buffer, str.byteOffset, str.byteLength)
    if (typeof str === 'string' && str.length === 20) return Buffer.from(str)
    if (typeof str === 'string' && str.length === 40) return Buffer.from(str, 'hex')
    throw new Error('Pass a buffer or a string')
  },
  getIPAddress: () => {
    let interfaces = require('os').networkInterfaces();
    for (let devName in interfaces) {
      let iface = interfaces[devName];
      for (let i = 0; i < iface.length; i++) {
        let alias = iface[i];
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          return alias.address;
        }
      }
    }
  },
  Uint8ArrayToHex(arr) {
    Array.from(arr).map(n => n.toString(16)).join('')
  }
}


module.exports = utils