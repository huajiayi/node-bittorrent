const dgram = require('dgram')
const EventEmitter = require('events')
const bencode = require('bencode')
const Table = require('./table')
const Token = require('./token')
const { randomString, toBuffer, Uint8ArrayToHex, getIPAddress } = require('./util')

// 默认值
const PORT = 6881
const BOOTSTRAPS = [{
  address: 'router.bittorrent.com',
  port: '6881'
}, {
  address: 'dht.transmissionbt.com',
  port: '6881'
}, {
  address: 'router.utorrent.com',
  port: '6881'
}]

function _initServer() {
  this._server.on('error', err => {
    this.emit('error', 'initServer_error' + err)
    this._server.close()
  })

  this._server.on('message', (msg, rinfo) => {
    try {
      msg = bencode.decode(msg)
      let tid = msg.t.toString('utf8')
      
      _receive.call(this, msg, rinfo)
    } catch (err) {
      _error.call(this, rinfo, 'e', 203)
    }
  })

  this._server.on('listening', () => {
    const address = this._server.address()
    this.emit('listening', address)
  })

  this._server.bind(this._port)
}

function _initEventQueue() {
  this._event = {}
  this._event.ping = new Map()
  this._event.find_node = new Map()
  this._event.get_peers = new Map()
  this._event.announce_peer = new Map()
}

// 加入任务队列，1秒后检测是否收到响应，如果没有收到则删除任务
function _addEvent(tid, query, callback) {
  if(this._event[query].size >= 1000) {
    this.emit('error', `${query} eventqueue is full`)
    return
  }

  this._event[query].set(tid, {
    query,
    getResponse: false,
    callback
  })
  setTimeout(() => {
    if(this._event[query].has(tid) && !this._event[query].getResponse) {
      this._event[query].delete(tid)
      callback('no response')
    }
  }, 1000)
}

function _error(address, tid, status) {
  let data = {
    t: tid || 'e',
    y: 'e',
  }
  switch (status) {
    case 201:
      data.e = [201, 'Generic Error']
      break
    case 202:
      data.e = [202, 'Server Error']
      break
    case 203:
      data.e = [203, 'Protocol Error']
      break
    case 204:
      data.e = [204, 'Method Unknown']
      break
    default:
      break
  }
  let buf = bencode.encode(data).toString()

  this._server.send(buf, 0, buf.length, address.port, address.address, err => {
    if (err) this.emit('error', 'error_error' + err)
  })
}

function _response(address, tid, arg) {
  let data = {
    t: tid,
    y: 'r',
    r: arg
  }
  let buf = bencode.encode(data)

  this._server.send(buf, 0, buf.length, address.port, address.address, err => {
    if (err) this.emit('error', 'response_error' + err)
  })
}

function _query(address, query, arg, callback) {
  let port = parseInt(address.port)
  if(!port || typeof port !== 'number' || port <= 0 || port > 65535) return

  let tid = randomString(5)
  let data = {
    t: tid,
    y: 'q',
    q: query,
    a: arg
  }
  let buf = bencode.encode(data)
  
  this._server.send(buf, 0, buf.length, address.port, address.address, err => {
    if (err) this.emit('error', 'query_error' + err)
  })

  _addEvent.call(this, tid, query, callback)
}

function _handleQuery(tid, id, query, arg, address) {
  let ownId = this._id
  let target
  let nodes
  let info_hash
  let implied_port
  let token
  let port

  switch (query) {
    case 'ping':
      _response.call(this, address, tid, { id: ownId })
      break
    case 'find_node':
      target = arg.target.toString('hex')
      nodes = this._table.getClosest(target, 8)
                  .map(node => `${Uint8ArrayToHex(node.id)}${node.address}${node.port}`)
                  .join('')
      this._table.add(id, address.address, address.port)

      _response.call(this, address, tid, { id: ownId, nodes })
      break
    case 'get_peers':
      info_hash = arg.info_hash.toString('hex')
      token = this._token.getToken()
      nodes = this._table.getClosest(info_hash, 8)
                  .map(node => `${Uint8ArrayToHex(node.id)}${node.address}${node.port}`)
                  .join('')
      this._table.add(id, address.address, address.port, token)

      _response.call(this, address, tid, { id: ownId, token, nodes })
      break
    case 'announce_peer':
      if(arg.implied_port) implied_port = parseInt(arg.implied_port)
      info_hash = arg.info_hash.toString('hex')
      port = parseInt(arg.port)
      token = arg.token.toString('utf8')
      
      if(!this._token.isValid(token)) return

      port = (implied_port && implied_port === 1) ? address.port : port
      this.emit('announce', info_hash, { address: address.address, port })
      _response.call(this, address, tid, { id: ownId })
      break
    case 'sample_infohashes':
      break
    default:
      _error.call(this, address, tid, 204)
      break
  }
}

function _parseAddresses(addressBuffer) {
  if(!addressBuffer || addressBuffer.length < 6) return {}

  let addresses
  for(let i = 0; i < addressBuffer.length; i += 6) {
    let buf = addressBuffer.slice(i, i + 6)
    let ip_part1 = parseInt(buf.slice(0,1).toString('hex'), 16)
    let ip_part2 = parseInt(buf.slice(1,2).toString('hex'), 16)
    let ip_part3 = parseInt(buf.slice(2,3).toString('hex'), 16)
    let ip_part4 = parseInt(buf.slice(3,4).toString('hex'), 16)
    let port = parseInt(buf.slice(4,6).toString('hex'), 16)

    addresses = {
      address: `${ip_part1}.${ip_part2}.${ip_part3}.${ip_part4}`,
      port
    }
  }

  return addresses
}

// 1个node为26字节，分为20字节的nodeId,4字节的ip地址和2字节的端口号
function _parseNodes(nodesBuffer) {
  if(!nodesBuffer || nodesBuffer.length < 26) return []

  let nodes = []

  for(let i = 0; i < nodesBuffer.length; i += 26) {
    let buf = nodesBuffer.slice(i, i + 26)
    let id = buf.slice(0, 20).toString('hex')
    let address = _parseAddresses(buf.slice(20, 26))

    nodes.push({
      id,
      ...address
    })
  }

  return nodes
}

function hasEvent(tid) {
  for(let name in this._event) {
    if(this._event[name].has(tid)) return this._event[name].get(tid)
  }

  return null
}

function _handleResponse(tid, response, address) {
  let event = hasEvent.call(this, tid)
  if(!event) return

  let { query, callback } = event

  this._event[query].get(tid).getResponse = true
  
  let id =  response.id.toString('hex')

  let nodesBuffer
  let nodes
  let values

  switch (query) {
    case 'ping':
      callback(null, id, address)
      break
    case 'find_node':
      nodesBuffer = response.nodes || Buffer.from('')
      nodes = _parseNodes(nodesBuffer)
      nodes.forEach(node => {
        this._table.add(node.id, node.address, node.port)
      })
      
      callback(null, id, nodes, address)
      break
    case 'get_peers':
      if(response.values) values = response.values.map(_parseAddresses)
      if(response.nodes) {
        nodes = _parseNodes(response.nodes)
        nodes.forEach(node => {
          this._table.add(node.id, node.address, node.port)
        })
      }

      callback(null, id, values, nodes, address)
      break
    case 'announce_peer':
      callback(null, id, address)
      break
    default:
      _error.call(this, address, tid, 204)
      break
  }

  this._event[query].delete(tid)
}

function _receive(message, address) {
  let tid = null

  try {
    tid = message.t.toString('utf8')
    id = message.id
    let type = message.y.toString('utf8')

    if(type === 'q') {
      let query = message.q.toString('utf8')
      _handleQuery.call(this, tid, id, query, message.a, address)
    }else {
      _handleResponse.call(this, tid, message.r, address)
    }
  } catch (err) {
    _error.call(this, address, tid, 203)
  }
}

function _initTable() {
  let bootstraps = this._bootstraps
  let id = toBuffer(this._id)

  function query(node, target) {
    // console.log(`call ${node.address}:${node.port}`)
    _query.call(this, node, 'find_node', { id, target }, (err, id, nodes, address) => {
      if(err) {
        if(err !== 'no response') this.emit('error', 'initTable_error' + err)
        return
      }
    })
  }
  
  bootstraps.forEach(node => {
    query.call(this, node, id)
  })
  
  // 每5秒对路由表中的所有节点进行find_node请求来完善路由表
  setInterval(() => {
    this._table.getAllNodes().forEach(node => {
      query.call(this, node, id)
    })
    // console.log(this._table.getAllNodes().length)
  }, 5000)
}

function _lookup(nodes, infoHash, infoHashTable, count, callback) {
  let id = toBuffer(this._id)
  infoHash = toBuffer(infoHash)

  // 利用Promise.all的规则，如果找到了peer，则reject出去
  const getPeerTasks = () => {
    let tasks = []
    nodes.forEach(node => {
      tasks.push(new Promise((resolve, reject) => {
        let address = {
          address: node.address,
          port: node.port
        }

        _query.call(this, address, 'get_peers', { id, info_hash: infoHash }, (err, id, values, nodes, address) => {
          if(err) {
            if(err === 'no response') {
              resolve()
            }else {
              this.emit('error', 'lookup_error' + err)
            }
            return
          }
          
          if(values) {
            reject(values)
            return
          }

          nodes.forEach(node => {
            infoHashTable.add(node.id, node.address, node.port)
          })
          resolve()
        })
      }))
    })
    return tasks
  }

  // 如果table里node的数量不变，说明不能再进一步获取了，返回not found
  let tasks = getPeerTasks()
  Promise.all(tasks).then(() => {
    let nodes = infoHashTable.getClosest(infoHash, 8)
    if(nodes.length === count) {
      callback(`${infoHash.toString('hex')} not found`)
      return
    }

    _lookup.call(this, nodes, infoHash, infoHashTable, nodes.length, callback)
  }).catch(peers => {
    callback(null, peers)
  })
}

class DHT extends EventEmitter {
  constructor(opt) {
    super()

    const option = opt || {}
    this._server = dgram.createSocket('udp4')
    this._id = option.id || Table.generateId()
    this._port = option.port || PORT
    this._bootstraps = option.bootstraps || BOOTSTRAPS
    this._table = new Table(this._id, this, {
      k: 20
    })
    this._token = new Token()

    _initEventQueue.call(this)
    _initServer.call(this)
    _initTable.call(this)
  }

  ping(address, port, id, callback) {
    id = toBuffer(id)
    _query.call(this, { address, port }, 'ping', { id }, callback)
  }

  findNode(address, port, id, target, callback) {
    // id = toBuffer(id)
    // target = toBuffer(target)
    _query.call(this, { address, port }, 'find_node', { id, target }, callback)
  }

  getPeers(address, port, id, infoHash, callback) {
    id = toBuffer(id)
    infoHash = toBuffer(infoHash)
    _query.call(this, { address, port }, 'get_peers', { id, info_hash: infoHash }, callback)
  }

  lookup(infoHash, callback) {
    let nodes = this._table.getClosest(infoHash, 8)
    let infoHashTable = new Table(infoHash, this)
    _lookup.call(this, nodes, infoHash, infoHashTable, 1, callback)
  }

  getInfo() {
    return {
      id: this._id,
      address: getIPAddress(),
      port: this._port
    }
  }

  getAllNodes() {
    return this._table.getAllNodes()
  }

  destroy() {
    this._server.close()
  }
}

module.exports = DHT