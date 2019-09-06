let _token = null
const { randomString } = require('./util')

class Token {
  constructor() {
    _token = Token.generateToken()
    // 每10分钟刷新一次Token
    setInterval(() => {
      _token = Token.generateToken()
    }, 600000);
  }

  static generateToken() {
    return randomString(10)
  }

  getToken() {
    return _token
  }

  isValid(token) {
    return token === _token
  }
}

module.exports = Token