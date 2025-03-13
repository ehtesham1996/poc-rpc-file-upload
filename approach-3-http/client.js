'use strict';

const fs = require('fs')
const RPC = require('@hyperswarm/rpc')
const cenc = require('compact-encoding')
const CoreStore = require('corestore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const DHT = require('hyperdht');
const { argv } = require('process');

const serverKey = '7c383e9664c8dbf5fa43e118003057dfc4896ce213dda0339176762dd829fb3d'
const method = 'writeFile'

const data = {
  key: '',
  path: '/test.pdf',
}

const FILE_URL = argv[2]

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

const main = async () => {
  try {
    // resolved distributed hash table seed for key pair
    const coreStore = new CoreStore('./store/approach-3-client')
    const hcore = coreStore.get({ name: 'approach-3' })

    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    let dhtSeed = (await hbee.get('dht-seed'))?.value
    if (!dhtSeed) {
      // not found, generate and store in db
      dhtSeed = crypto.randomBytes(32)
      await hbee.put('dht-seed', dhtSeed)
    }

    // start distributed hash table, it is used for rpc service discovery
    const dht = new DHT({
      port: 50001,
      keyPair: DHT.keyPair(dhtSeed),
      bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
    })
    await dht.ready()
    const rpc = new RPC({
      dht
    })

    const client = rpc.connect(Buffer.from(serverKey, 'hex'))

    if (!isValidUrl(FILE_URL)) {
      throw new Error('Invalid file url')
    }

    data.fileUrl = FILE_URL
    const res = await client.request(method, Buffer.from(JSON.stringify(data)))

    console.log(res.toString())

    await rpc.destroy()

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(-1)
  }
}

main()