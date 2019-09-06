const DHT = require('../index')

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

let dht1 = new DHT({
  port: 20000
})

dht1.on('listening', address => {
  console.log(`server listening ${address.address}:${address.port}`)

  checkPing()

  checkFindNode()

  checkGetPeers()

  setTimeout(() => {
    checkLookup()
  }, 5000)
})

dht1.on('error', err => {
  console.log(`server error:\n${err}`)
})

dht1.on('announce', (infoHash, address) => {
  console.log(`receive magnet:?xt=urn:btih:${infoHash.toUpperCase()} from ${address.address}:${address.port}`)
  dht1.lookup(infoHash, (err, peers) => {
    if(err) {
      console.log(err)
    }else {
      console.log(`find peers of ${infoHash}`)
      console.log(peers)
    }
  })
})

let dht2 = new DHT({
  port: 20001
})

dht2.on('listening', address => {
  console.log(`server listening ${address.address}:${address.port}`)

  checkPing()

  checkFindNode()

  checkGetPeers()

  setTimeout(() => {
    checkLookup()
  }, 5000)
})

function checkPing() {
  let { id, port } = dht1.getInfo()

  dht1.ping(BOOTSTRAPS[0].address, BOOTSTRAPS[0].port, id, (err, id, address) => {
    if(err) console.log(err)
    else console.log(`${id} from ${address.address}:${address.port}`)
  })
  // setInterval(() => {
  //   dht1.ping(BOOTSTRAPS[0].address, BOOTSTRAPS[0].port, id, (err, id, address) => {
  //     if(err) console.log(err)
  //     else console.log(`${id} from ${address.address}:${address.port}`)
  //   })
  // }, 5000)
}

function checkFindNode() {
  let { id, port } = dht1.getInfo()
  console.log(id)
  id = 'abcdefghij0123456789'

  dht1.findNode(BOOTSTRAPS[0].address, BOOTSTRAPS[0].port, id, id, (err, id, nodes, address) => {
    if(err) console.log(err)
    else console.log(nodes)
  })
  // setInterval(() => {
  //   dht1.findNode(BOOTSTRAPS[0].address, BOOTSTRAPS[0].port, id, id, (err, id, nodes, address) => {
  //     if(err) console.log(err)
  //     else console.log(nodes)
  //   })
  // }, 5000)
}

function checkGetPeers() {
  let { id, port } = dht1.getInfo()
  let infoHash = 'e3811b9539cacff680e418124272177c47477157'

  dht1.getPeers(BOOTSTRAPS[0].address, BOOTSTRAPS[0].port, id, infoHash, (err, id, values, nodes, address) => {
    if(err) {
      console.log(err)
      return
    } 

    if(values) console.log(values)
    if(nodes) console.log(nodes)
  })
  // setInterval(() => {
  //   dht1.getPeers(BOOTSTRAPS[0].address, BOOTSTRAPS[0].port, id, infoHash, (err, id, values, nodes, address) => {
  //     if(err) {
  //       console.log(err)
  //       return
  //     } 
  
  //     if(values) console.log(values)
  //     if(nodes) console.log(nodes)
  //   })
  // }, 5000)
}

function checkLookup() {
  dht1.lookup('DDCB691E7CC497BF17FA13F06EC3BB9583AA6E60', (err, peers) => {
    if(err) console.log(err)
    else console.log(peers)
  })
}
