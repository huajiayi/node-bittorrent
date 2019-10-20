# node-bittorrent

node-bittorrent是BitTorrent协议的node实现。

如果你觉得这个项目还不错，请给我点个star，万分感谢！

### 安装

```
npm install node-bittorrent
```

### 栗子

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

创建一个新的 `DHT` 实例。

如果指定了 `opt`, 默认配置（如下所示）将会被覆盖。

```js
{
  id: '',        // 160位的 DHT node ID(Buffer或是16进制字符串, 默认：自动生成)
  port: 6881,    // 部署DHT的端口
  bootstraps: [] // 引路人服务器 (默认：router.bittorrent.com:6881, router.utorrent.com:6881, dht.transmissionbt.com:6881)
}
``` 


#### `ping(address, port, id, callback)`

相当于DHT请求里的 `ping`。

##### 栗子

```js
dht.ping('router.bittorrent.com', 6881, 'abcdefghij0123456789', (err, id, address) => {
  if(err) console.log(err)
  else console.log(`${id} from ${address.address}:${address.port}`)
})
```

#### `findNode(address, port, id, target, callback)`


相当于DHT请求里的 `find_node`。

##### 栗子

```js
dht.findNode('router.bittorrent.com', 6881, 'abcdefghij0123456789', 'mnopqrstuvwxyz123456', (err, id, nodes, address) => {
  if(err) console.log(err)
  else console.log(nodes)
})
```

#### `getPeers(address, port, id, infohash, callback)`

相当于DHT请求里的 `get_peers`。

##### 栗子

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

寻找给定info hash的peers。

##### 栗子

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

返回一个对包含了DHT信息的对象。
这个对象包含 `id`, `address` 和 `port` 属性。

#### `getAllNodes()`

返回一个包含所有node的数组。

#### `destroy()`

销毁DHT实例。

##### 栗子

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

### 事件

#### `dht.on('listening', callback)`

当DHT在监听的时候会触发此事件。

##### 栗子

```js
dht.on('listening', address => {
  console.log(`server listening ${address.address}:${address.port}`)
})
```

#### `dht.on('error', callback)`

当DHT发生致命错误的时候触发此事件。

##### 栗子

```js
dht.on('error', err => {
  console.log(`server error:\n${err}`)
})
```

#### `dht.on('announce', callback)`

当一个node宣告他在某个端口下载一个种子时触发此事件。

##### 栗子

```js
dht.on('announce', (infoHash, address) => {
  console.log(`receive magnet:?xt=urn:btih:${infoHash.toUpperCase()} from ${address.address}:${address.port}`)
})
```

### 协议

node-bittorrent 使用 MIT 协议.