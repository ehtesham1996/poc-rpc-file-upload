'use strict'

const fastify = require('fastify')({ 
  logger: true,
  bodyLimit: 1024 * 1024 * 100 // 100MB limit
})
const pump = require('pump')
const Localdrive = require('localdrive')

// Register multipart plugin
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 100 * 1024 * 1024 * 1024 // 100GB
  }
})

const drive = new Localdrive('./drives/approach-3')

fastify.post('/upload', async (request, reply) => {
  const startTime = Date.now()
  const data = await request.file()
  
  if (!data) {
    return reply.code(400).send({ error: 'No file uploaded' })
  }

  const fileName = data.filename || 'uploaded-file'
  const writeStream = drive.createWriteStream(fileName)
  let bytesUploaded = 0

  data.file.on('data', chunk => {
    bytesUploaded += chunk.length
  })

  await new Promise((resolve, reject) => {
    pump(data.file, writeStream, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })

  const endTime = Date.now()
  const timeTaken = (endTime - startTime) / 1000
  const fileSizeMB = bytesUploaded / (1024 * 1024)
  const speedMBps = fileSizeMB / timeTaken

  console.log(`Upload Statistics:
    File Size: ${fileSizeMB.toFixed(2)} MB
    Time Taken: ${timeTaken.toFixed(2)} seconds
    Speed: ${speedMBps.toFixed(2)} MB/s`)
  
  return { 
    success: true,
    stats: {
      fileSize: bytesUploaded,
      timeTaken,
      speed: speedMBps
    }
  }
})

fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
