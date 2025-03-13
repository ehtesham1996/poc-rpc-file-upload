'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const CoreStore = require('corestore')
const goodBye = require('graceful-goodbye')
const Localdrive = require('localdrive')

async function main() {

  const coreStore = new CoreStore('./store/approach-2-server')
  const core = coreStore.get({ name: 'approach-2' })

  const hbee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
  await hbee.ready()

  let dhtSeed = (await hbee.get('dht-seed'))?.value
  if (!dhtSeed) {
    // not found, generate and store in db
    dhtSeed = crypto.randomBytes(32)
    await hbee.put('dht-seed', dhtSeed)
  }

  let rpcSeed = (await hbee.get('rpc-seed'))?.value
  if (!rpcSeed) {
    rpcSeed = crypto.randomBytes(32)
    await hbee.put('rpc-seed', rpcSeed)
  }

  const dht = new DHT({
    port: 40001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
  })
  await dht.ready()

  const rpc = new RPC({
    seed: rpcSeed,
    dht
  });
  const rpcServer = rpc.createServer()
  await rpcServer.listen()
  console.log('rpc server started listening on public key:', rpcServer.publicKey.toString('hex'))

  goodBye(async () => {
    await rpcServer.close()
    await dht.destroy()
    await coreStore.close()
  })

  const drive = new Localdrive('./drives/approach-2')
  rpcServer.respond('writeFile', async (reqRaw) => {
    try {
      const req = JSON.parse(reqRaw.toString())
      const {
        key,
        path,
        data
      } = req;
      // If we are here we should write file to hyperdrive instance
      // for POC purpose i am just writing it to local file system
      await drive.put(path, Buffer.from(data, 'base64'))
      return Buffer.from(JSON.stringify({ path, success: true }))
    } catch (e) {
      console.error(e)
      return Buffer.from(JSON.stringify({ success: false }))
    }

  })
}

main().catch(console.error)