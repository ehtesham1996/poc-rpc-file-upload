'use strict'

const RPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const CoreStore = require('corestore')
const goodBye = require('graceful-goodbye')
const Localdrive = require('localdrive')
const cenc = require('compact-encoding');

async function main() {
  const coreStore = new CoreStore('./store/approach-1-server')
  const core = coreStore.get({ name: 'approach-1' })

  const hbee = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
  await hbee.ready()

  // let dhtSeed = (await hbee.get('dht-seed'))?.value
  // if (!dhtSeed) {
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
  //   bootstrap: [{ host: '127.0.0.1', port: 30001 }]
  // })
  // await dht.ready()

  const rpc = new RPC({
    seed: rpcSeed,
    // dht
  });

  const rpcServer = rpc.createServer()
  await rpcServer.listen()
  console.log('rpc server started listening on public key:', rpcServer.publicKey.toString('hex'))

  goodBye(async () => {
    await rpcServer.close()
    // await dht.destroy()
    await coreStore.close()
  })

  const drive = new Localdrive('./drives/approach-1')
  const activeUploads = new Map()

  rpcServer.respond('initUpload', async (reqRaw) => {
    const { path, totalChunks } = JSON.parse(reqRaw.toString())
    const uploadId = crypto.randomBytes(16).toString('hex')
    const writeStream = drive.createWriteStream(path)

    activeUploads.set(uploadId, {
      path,
      writeStream,
      totalChunks,
      receivedChunks: 0,
      bytesReceived: 0,
      startTime: Date.now()
    })
    return Buffer.from(JSON.stringify({ uploadId }))
  })

  rpcServer.respond('uploadChunk', async (reqRaw) => {
    const { uploadId, chunkIndex, data } = cenc.decode(cenc.json, reqRaw)
    const upload = activeUploads.get(uploadId)
    if (!upload) return cenc.encode(cenc.json, { success: false, error: 'Invalid upload ID' })

    const chunk = Buffer.from(data)
    upload.writeStream.write(chunk)
    upload.receivedChunks++
    upload.bytesReceived += chunk.length

    if (upload.receivedChunks === upload.totalChunks) {
      const endTime = Date.now()
      const timeTaken = (endTime - upload.startTime) / 1000
      const fileSizeMB = upload.bytesReceived / (1024 * 1024)
      const speedMBps = fileSizeMB / timeTaken

      console.log(`\nUpload Statistics:
    File Size: ${fileSizeMB.toFixed(2)} MB
    Time Taken: ${timeTaken.toFixed(2)} seconds
    Speed: ${speedMBps.toFixed(2)} MB/s`)

      upload.writeStream.end()
      activeUploads.delete(uploadId)
      return cenc.encode(cenc.json, { success: true, completed: true })
    }

    return cenc.encode(cenc.json, { success: true, completed: false })
  })
}

main().catch(console.error)
