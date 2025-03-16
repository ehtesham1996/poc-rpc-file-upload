'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const CoreStore = require('corestore')
const goodBye = require('graceful-goodbye')
const cenc = require('compact-encoding')
const Localdrive = require('localdrive')
const Hyperswarm = require('hyperswarm')

const pendingTransfers = new Map()

async function main() {
  const coreStore = new CoreStore('./store/approach-2-server')
  const core = coreStore.get({ name: 'approach-2' })

  const hbee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
  await hbee.ready()

  // let dhtSeed = (await hbee.get('dht-seed'))?.value
  // if (!dhtSeed) {
  //   // not found, generate and store in db
  //   dhtSeed = crypto.randomBytes(32)
  //   await hbee.put('dht-seed', dhtSeed)
  // }

  let rpcSeed = (await hbee.get('rpc-seed'))?.value
  if (!rpcSeed) {
    rpcSeed = crypto.randomBytes(32)
    await hbee.put('rpc-seed', rpcSeed)
  }

  // const dht = new DHT({
  //   port: 40001,
  //   keyPair: DHT.keyPair(dhtSeed),
  //   bootstrap: [{ host: '127.0.0.1', port: 30001 }] // note boostrap points to dht that is started via cli
  // })
  // await dht.ready()

  const rpc = new RPC({
    seed: rpcSeed,
    // dht
  });
  const rpcServer = rpc.createServer()
  await rpcServer.listen()
  console.log('rpc server started listening on public key:', rpcServer.publicKey.toString('hex'))

  const swarm = new Hyperswarm({
    // dht
  })
  const drive = new Localdrive('./drives/approach-2')

  rpcServer.respond('initiateTransfer', async (reqRaw) => {
    try {
      const req = cenc.decode(cenc.json, reqRaw)
      const token = crypto.randomBytes(32).toString('hex')
      
      const swarm = new Hyperswarm({
        // dht
      })

      let startTime, endTime

      swarm.on('connection', (conn, info) => {
        conn.once('data', async (data) => {
          const token = data.toString('hex')
          const transfer = pendingTransfers.get(token)
          
          if (!transfer) {
            conn.end()
            return
          }
    
          console.log('transfer found')
    
          const writeStream = drive.createWriteStream(transfer.path)
          startTime = Date.now()
          let bytesReceived = 0

          conn.on('data', chunk => {
            bytesReceived += chunk.length
          })

          conn.pipe(writeStream)
          
          conn.once('end', () => {
            endTime = Date.now()
            const timeTaken = (endTime - startTime) / 1000
            const fileSizeMB = bytesReceived / (1024 * 1024)
            const speedMBps = fileSizeMB / timeTaken

            console.log(`\nUpload Statistics:
    File Size: ${fileSizeMB.toFixed(2)} MB
    Time Taken: ${timeTaken.toFixed(2)} seconds
    Speed: ${speedMBps.toFixed(2)} MB/s`)

            console.log('transfer ended')
            pendingTransfers.delete(token)
          })

          conn.on('error', (_err) => {
            conn.end()
          })
        })
      })
      swarm.listen()
      await swarm.flush()

      pendingTransfers.set(token, {
        path: req.path,
        timestamp: Date.now(),
        swarm
      })

      return Buffer.from(JSON.stringify({ 
        token,
        signedKey: swarm.keyPair.publicKey.toString('hex'),
        success: true 
      }))
    } catch (e) {
      console.error(e)
      return Buffer.from(JSON.stringify({ success: false }))
    }
  })

  goodBye(async () => {
    await rpcServer.close()
    await swarm.destroy()
    // await dht.destroy()
    await coreStore.close()
  })
}

main().catch(console.error)