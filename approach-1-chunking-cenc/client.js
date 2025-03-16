'use strict';

const fs = require('fs')
const RPC = require('@hyperswarm/rpc')
const CoreStore = require('corestore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const DHT = require('hyperdht')
const { argv } = require('process');
const cenc = require('compact-encoding');
const path = require('path');

const serverKey = 'b84c107e4cf8d34207faa2aad0d17938faa84e47d0a562417a927a4b852ce718'
const CHUNK_SIZE = 1024 * 1024 * 4 // 4MB chunks

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

async function getFileSize(filePath) {
  const stats = await fs.promises.stat(filePath)
  return stats.size
}

const main = async () => {
  try {
    const coreStore = new CoreStore('./store/approach-1-client')
    const hcore = coreStore.get({ name: 'approach-1' })

    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    let dhtSeed = (await hbee.get('dht-seed'))?.value
    if (!dhtSeed) {
      dhtSeed = crypto.randomBytes(32)
      await hbee.put('dht-seed', dhtSeed)
    }

    // console.log('dhtSeed', dhtSeed.toString('hex'))
    dhtSeed = Buffer.from('8946351b14a8222a4034be5cd6ce17011b3d718da93e0a5a3104da15b520c6f7', 'hex')
    const dht = new DHT({
      // port: 50001,
      keyPair: DHT.keyPair(dhtSeed),
      // bootstrap: [{ host: '127.0.0.1', port: 30001 }]
    })
    await dht.ready()

    const rpc = new RPC({
      dht
    })
    const client = rpc.connect(Buffer.from(serverKey, 'hex'))

    const fileName = path.basename(FILE)
    const fileSize = await getFileSize(FILE)
    const fileSizeMB = fileSize / (1024 * 1024)
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE)
    let bytesUploaded = 0

    console.log(`Starting upload of ${fileName} (${fileSizeMB.toFixed(2)} MB)`)
    const startTime = Date.now()

    // Initialize upload
    const initRes = await client.request('initUpload', Buffer.from(JSON.stringify({
      path: '/mov.mov',
      totalChunks
    })))
    const { uploadId } = JSON.parse(initRes.toString())

    // Upload chunks
    let chunkIndex = 0
    for await (const chunk of generateChunks(FILE, CHUNK_SIZE)) {
      const reqJson = {
        uploadId,
        chunkIndex,
        data: chunk.data
      }

      const encodedBuffer = cenc.encode(cenc.json, reqJson)
      const res = await client.request('uploadChunk', encodedBuffer)
      
      const result = cenc.decode(cenc.json, res)
      if (!result.success) throw new Error('Chunk upload failed')
      
      bytesUploaded += chunk.data.length
      const progress = (bytesUploaded / fileSize * 100).toFixed(2)
      const uploadedMB = (bytesUploaded / (1024 * 1024)).toFixed(2)
      process.stdout.write(`\rProgress: ${progress}% (${uploadedMB}MB/${fileSizeMB.toFixed(2)}MB)`)

      chunkIndex++
    }

    const endTime = Date.now()
    const timeTaken = (endTime - startTime) / 1000
    const speedMBps = fileSizeMB / timeTaken

    console.log(`\nUpload Statistics:
    File Size: ${fileSizeMB.toFixed(2)} MB
    Time Taken: ${timeTaken.toFixed(2)} seconds
    Average Speed: ${speedMBps.toFixed(2)} MB/s`)

    await rpc.destroy()
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(-1)
  }
}

main()
