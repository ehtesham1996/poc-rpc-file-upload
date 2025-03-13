'use strict';

const fs = require('fs')
const RPC = require('@hyperswarm/rpc')
const CoreStore = require('corestore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const DHT = require('hyperdht')
const { argv } = require('process')

const serverKey = 'eb090c4b3e8358b56462ee9339b5bf2efa0750fa8f9fe2d4001f20d3db436bff'
const CHUNK_SIZE = 1024 * 1024 // 1MB chunks

const FILE = argv[2]

async function* generateChunks(filePath, chunkSize) {
  const fileHandle = await fs.promises.open(filePath)
  const buffer = Buffer.alloc(chunkSize)
  let bytesRead
  let position = 0

  while ((bytesRead = (await fileHandle.read(buffer, 0, chunkSize, position)).bytesRead) > 0) {
    yield {
      data: buffer.slice(0, bytesRead),
      position
    }
    position += bytesRead
  }

  await fileHandle.close()
}

const main = async () => {
  try {
    const coreStore = new CoreStore('./store/approach-4-client')
    const hcore = coreStore.get({ name: 'approach-4' })

    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    let dhtSeed = (await hbee.get('dht-seed'))?.value
    if (!dhtSeed) {
      dhtSeed = crypto.randomBytes(32)
      await hbee.put('dht-seed', dhtSeed)
    }

    const dht = new DHT({
      port: 50001,
      keyPair: DHT.keyPair(dhtSeed),
      bootstrap: [{ host: '127.0.0.1', port: 30001 }]
    })
    await dht.ready()

    const rpc = new RPC({ dht })
    const client = rpc.connect(Buffer.from(serverKey, 'hex'))

    const stats = await fs.promises.stat(FILE)
    const totalChunks = Math.ceil(stats.size / CHUNK_SIZE)

    // Initialize upload
    const initRes = await client.request('initUpload', Buffer.from(JSON.stringify({
      path: '/test.mov',
      totalChunks
    })))
    const { uploadId } = JSON.parse(initRes.toString())

    // Upload chunks
    let chunkIndex = 0
    for await (const chunk of generateChunks(FILE, CHUNK_SIZE)) {
      const res = await client.request('uploadChunk', Buffer.from(JSON.stringify({
        uploadId,
        chunkIndex,
        data: chunk.data.toString('base64')
      })))
      
      const result = JSON.parse(res.toString())
      if (!result.success) throw new Error('Chunk upload failed')
      
      console.log(`Uploaded chunk ${chunkIndex + 1}/${totalChunks} (${Math.round((chunkIndex + 1) / totalChunks * 100)}%)`)
      chunkIndex++
    }

    await rpc.destroy()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(-1)
  }
}

main()
