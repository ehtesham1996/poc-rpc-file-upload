'use strict'

const fs = require('fs')
const RPC = require('@hyperswarm/rpc')
const cenc = require('compact-encoding')
const CoreStore = require('corestore')
const Hyperbee = require('hyperbee')
const crypto = require('crypto')
const DHT = require('hyperdht')
const Hyperswarm = require('hyperswarm')
const { argv } = require('process')
const goodbye = require('graceful-goodbye')

const serverKey = 'b910f71f0494fe037de5980889204501c020d65b6fdb7ad080410b036dd26631'

const main = async () => {
  try {
    const FILE = argv[2]
    if (!FILE) throw new Error('File path required')

    // Get file stats
    const stats = await fs.promises.stat(FILE)
    const fileSize = stats.size
    const fileSizeMB = fileSize / (1024 * 1024)
    let bytesUploaded = 0

    console.log(`Starting upload of ${FILE} (${fileSizeMB.toFixed(2)} MB)`)

    // Setup DHT and CoreStore similar to approach-1
    const coreStore = new CoreStore('./store/approach-2-client')
    const hcore = coreStore.get({ name: 'approach-2' })

    const hbee = new Hyperbee(hcore, { keyEncoding: 'utf-8', valueEncoding: 'binary' })
    let dhtSeed = (await hbee.get('dht-seed'))?.value
    if (!dhtSeed) {
      // not found, generate and store in db
      dhtSeed = crypto.randomBytes(32)
      await hbee.put('dht-seed', dhtSeed)
    }

    // start distributed hash table, it is used for rpc service discovery
    const dht = new DHT({
      keyPair: DHT.keyPair(dhtSeed),
    })
    await dht.ready()

    const rpc = new RPC({
      dht,
      firewall: () => false
    })
    const client = rpc.connect(Buffer.from(serverKey, 'hex'))

    // Request transfer token
    const initData = { path: '/test.mov' }
    const buffer = cenc.encode(cenc.json, initData)
    const res = await client.request('initiateTransfer', buffer)
    const { token, signedKey, success } = JSON.parse(res.toString())

    console.log('res is ', res.toString())
    if (!success) throw new Error('Failed to initiate transfer')

    // Setup hyperswarm connection
    const swarm = new Hyperswarm({
      dht,
      firewall: () => false
    })
    const fileStream = fs.createReadStream(FILE)

    fileStream.on('data', chunk => {
      bytesUploaded += chunk.length
      const progress = (bytesUploaded / fileSize * 100).toFixed(2)
      const uploadedMB = (bytesUploaded / (1024 * 1024)).toFixed(2)
      process.stdout.write(`\rProgress: ${progress}% (${uploadedMB}MB/${fileSizeMB.toFixed(2)}MB)`)
    })

    let startTime, endTime
    swarm.on('connection', (conn) => {
      startTime = Date.now()
      console.log('\nconnected to server')
      // Send token first

      conn.write(Buffer.from(token, 'hex'))
      // Then stream the file
      fileStream.pipe(conn)

      fileStream.once('end', () => {
        conn.end()
        endTime = Date.now()
        const timeTaken = (endTime - startTime) / 1000
        const speedMBps = fileSizeMB / timeTaken

        console.log(`\nUpload Statistics:
    File Size: ${fileSizeMB.toFixed(2)} MB
    Time Taken: ${timeTaken.toFixed(2)} seconds
    Average Speed: ${speedMBps.toFixed(2)} MB/s`)

        swarm.leavePeer(Buffer.from(signedKey, 'hex'))
        setTimeout(() => process.exit(0), 1000)
      })
    })

    // Join the same topic as server
    swarm.joinPeer(Buffer.from(signedKey, 'hex'))
    await swarm.flush()

    await rpc.destroy()

    goodbye(async () => {
      await dht.destroy()
      await coreStore.close()
      await swarm.destroy()
      await rpc.destroy()
    })
  } catch (err) {
    console.error(err)
    process.exit(-1)
  }
}

main()