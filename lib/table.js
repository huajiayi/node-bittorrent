const DHT = require('./dht')
const { sha1, randomString, toBuffer, getIPAddress } = require('./util')

const CHECK_TIME = 900000 // 检查每个桶的时间，默认为15分钟
const K = 8 // 每个桶放置的节点数

function _compareId(firstId, secondId) {
  if(firstId === secondId) return true

  for(let i = 0; i < firstId.length; i++) {
    if(firstId[i] !== secondId[i]) return false
  }

  return true
}

function _isValidId(id) {
  return toBuffer(id).length === 20
}

function _determineBucket(id, bucket, bitIndex) {
  let byte = id[bitIndex >> 3] // 属于哪个字节
  let i = bitIndex % 8 // 相对于那个字节的第几位

  return (byte & (1 << (7 - i))) ? bucket.right : bucket.left
}

function _getAllNodes(bucket, allNodes) {
  if(!bucket) return

  if(bucket.nodes) allNodes.push(...bucket.nodes)

  _getAllNodes(bucket.left, allNodes)
  _getAllNodes(bucket.right, allNodes)
}

class Node {
  constructor(id, address, port, token) {
    this.id = id
    this.address = address
    this.port = port
    this.token = token
    this.isGood = true
  }

  replace(id, address, port, token) {
    this.id = id
    this.address = address
    this.port = port
    this.token = token
    this.isGood = true
  }
}

class KBucket {
  constructor(dht, checkTime) {
    this.left = null
    this.right = null
    this.nodes = []
    this._dht = dht
    this._checkTime = checkTime || CHECK_TIME
    this._canSplit = true

    setInterval(() => {
      if(this.nodes) {
        for(let node of this.nodes) {
          if(!node.isGood) continue
          this._dht.ping(node.address, node.port, node.id, err => {
            if(err && err === 'no response') node.isGood = false
          })
        }
      }
    }, this._checkTime)
  }

  existNode(id) {
    for(let node of this.nodes) {
      if(_compareId(node.id, id)) return node
    }

    return null
  }

  addNode(id, address, port, token) {
    this.nodes.push(new Node(id, address, port, token))
  }

  split() {
    this.left = new KBucket(this._dht, this._checkTime)
    this.right = new KBucket(this._dht, this._checkTime)
  }
}

class Table {
  constructor(id, dht, opt) {
    if(!id || !_isValidId(id)) return new Error(`${id} is not a valid id`)
    if(!dht) return new Error(`dht is required`)

    let option = opt || {}
    this._checkTime = option.checkTime || CHECK_TIME
    this._id = new Uint8Array(toBuffer(id))
    this._dht = dht
    this._k = option.k || K

    this._root = new KBucket(this._dht, this._checkTime)
    let address = getIPAddress()
    let port = this._dht.getInfo().port
    this._root.addNode(this._id, address, port)
  }

  static generateId(){
    let ramdomLength = Math.floor(Math.random() * 100000)
    return sha1(`${randomString(ramdomLength)}}`)
  }

  add(id, address, port, token) {
    if(!id || !_isValidId(id)) return new Error(`${id} is not a valid id`)

    id = new Uint8Array(toBuffer(id))
    let bucket = this._root
    let bitIndex = 0

    // 如果没有，说明不是根节点，继续寻找
    while(!bucket.nodes) {
      bucket = _determineBucket(id, bucket, bitIndex++)
    }
    if(bucket.nodes.length < this._k) {
      // 如果存在id相同的节点，则替换节点的信息
      let existedNode = bucket.existNode(id)
      if(existedNode) {
        existedNode.replace(id, address, port, token)
        return
      }

      bucket.addNode(id, address, port, token)
      return
    }

    // 检查是否有bad结点，有则替换
    for(let node of bucket.nodes) {
      if(!node.isGood) {
        node.replace(id, address, port, token)
        return
      } 
    }

    // 把桶分裂成两个，自己id所在的桶才可以分裂，另外一个设置成不可分裂
    if(!bucket._canSplit) return

    bucket.split()
    let ownBucket = _determineBucket(this._id, bucket, bitIndex)
    let otherBucker = ownBucket === bucket.left ? bucket.right : bucket.left
    otherBucker._canSplit = false
    // 把节点放入相应的桶
    for(let node of bucket.nodes) {
      let tempBucket = _determineBucket(node.id, bucket, bitIndex)
      tempBucket.addNode(node.id, node.address, node.port, node.token)
    }
    bucket.nodes = null // 删除原先节点的引用，方便后续查找
    let tempBucket = _determineBucket(id, bucket, bitIndex)
    tempBucket.addNode(id, address, port, token)
  }

  getClosest(id, k) {
    let allNodes = []
    _getAllNodes(this._root, allNodes)

    return allNodes.map(a => [a, this.distance(id, a.id)])
                   .sort((a, b) => a[1]-b[1])
                   .slice(0, k)
                   .map(a => a[0])
  }

  getAllNodes() {
    let allNodes = []
    _getAllNodes(this._root, allNodes)
    return allNodes
  }

  // 两个节点之间的距离，这里的距离是用异或计算出来的相对距离
  distance(firstId, secondId) {
    let distance = 0
    let min = firstId.length < secondId.length ? firstId : secondId
    let max = firstId.length >= secondId.length ? firstId : secondId
    let diff = max.length - min.length
  
    let i
    for(i = 0; i < max.length; i++) {
      if(i < diff) {
        distance = distance * 256 + (max[i] ^ 0)
      }else {
        distance = distance * 256 + (max[i] ^ min[i - diff])
      }
    }
  
    return distance
  }
}

module.exports = Table