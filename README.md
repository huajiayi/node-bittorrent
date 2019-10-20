# node-bittorrent

[简体中文](https://github.com/huajiayi/node-bittorrent/blob/master/README_CN.md) | English

node-bittorrent is a BitTorrent DHT implementation in node.

If you like it, please give me a star. Thanks a lot!

### Install

```
npm install node-bittorrent
```

### Example

```js
const DHT = require('node-bittorrent')

let dht = new DHT({
  port: 20000
})

dht.on('listening', address => {
  console.log(`server listening ${address.address}:${address.port}`)
})

dht.on('error', err => {
  console.log(`server error:\n${err}`)
})

dht.on('announce', (infoHash, address) => {
  console.log(`receive magnet:?xt=urn:btih:${infoHash.toUpperCase()} from ${address.address}:${address.port}`)

  // find peers for the given info hash
  dht.lookup(infoHash, (err, peers) => {
    if(err) {
      console.log(err)
    }else {
      console.log(`find peers of ${infoHash}`)
      console.log(peers)
    }
  })
})
```

### API

#### `new DHT([opt])`

Create a new `DHT` instance.

if `opt` is specified, then the default options (show below) will be overridden.

```js
{
  id: '',        // 160-bit DHT node ID(Buffer or hex String, default: randomly generated)
  port: 6881,    // make the DHT listen on the given port
  bootstraps: [] // bootstrap servers (default: router.bittorrent.com:6881, router.utorrent.com:6881, dht.transmissionbt.com:6881)
}
``` 


#### `ping(address, port, id, callback)`

Corresponse to the `ping` in DHT Queries.

##### example

```js
dht.ping('router.bittorrent.com', 6881, 'abcdefghij0123456789', (err, id, address) => {
  if(err) console.log(err)
  else console.log(`${id} from ${address.address}:${address.port}`)
})
```

#### `findNode(address, port, id, target, callback)`

Corresponse to the `find_node` in DHT Queries.

##### example

```js
dht.findNode('router.bittorrent.com', 6881, 'abcdefghij0123456789', 'mnopqrstuvwxyz123456', (err, id, nodes, address) => {
  if(err) console.log(err)
  else console.log(nodes)
})
```

#### `getPeers(address, port, id, infohash, callback)`

Corresponse to the `get_peers` in DHT Queries.

##### example

```js
dht.getPeers('router.bittorrent.com', 6881, 'abcdefghij0123456789', 'e3811b9539cacff680e418124272177c47477157', (err, id, values, nodes, address) => {
  if(err) {
    console.log(err)
    return
  }
  
  if(values) console.log(values)
  if(nodes) console.log(nodes)
})
```

#### `lookup(infoHash, callback)`

Find peers for the given info hash.

##### example

```js
dht.lookup('DDCB691E7CC497BF17FA13F06EC3BB9583AA6E60', (err, peers) => {
  if(err) {
    console.log(err)
    return
  } 

  console.log(`find peers of ${infoHash}`)
  console.log(peers)
})
```

#### `getInfo()`

Returns an object containing the information of the DHT.
This object contains `id`, `address` and `port` properties.

#### `getAllNodes()`

Returns an array containing all nodes in the routing table.

#### `destroy()`

Destroy the DHT.

##### example

```js
dht.lookup('DDCB691E7CC497BF17FA13F06EC3BB9583AA6E60', (err, peers) => {
  if(err) {
    console.log(err)
    return
  } 

  console.log(`find peers of ${infoHash}`)
  console.log(peers)
})
```

### Event

#### `dht.on('listening', callback)`

Emitted when the DHT is listening.

##### example

```js
dht.on('listening', address => {
  console.log(`server listening ${address.address}:${address.port}`)
})
```

#### `dht.on('error', callback)`

Emitted when the DHT has a fatal error.

##### example

```js
dht.on('error', err => {
  console.log(`server error:\n${err}`)
})
```

#### `dht.on('announce', callback)`

Emitted when a node announces that it is downloading a torrent on a port.

##### example

```js
dht.on('announce', (infoHash, address) => {
  console.log(`receive magnet:?xt=urn:btih:${infoHash.toUpperCase()} from ${address.address}:${address.port}`)
})
```

### License

node-bittorrent is distributed under the MIT License.