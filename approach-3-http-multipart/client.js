'use strict'

const fs = require('fs')
const FormData = require('form-data')
const path = require('path')
const axios = require('axios')
const { argv } = require('process')

const FILE = argv[2]

async function getFileSize(filePath) {
  const stats = await fs.promises.stat(filePath)
  return stats.size
}

const API_URL = 'http://cosmic-staging-gpu-01.tail8a2a3f.ts.net:4041/upload'

async function main() {
  try {
    const fileName = path.basename(FILE)
    const fileSize = await getFileSize(FILE)
    const fileSizeMB = fileSize / (1024 * 1024)
    
    const form = new FormData()
    const fileStream = fs.createReadStream(FILE)
    let bytesUploaded = 0

    // fileStream.on('data', chunk => {
    //   bytesUploaded += chunk.length
    //   const progress = (bytesUploaded / fileSize * 100).toFixed(2)
    //   const uploadedMB = (bytesUploaded / (1024 * 1024)).toFixed(2)
    //   process.stdout.write(`\rProgress: ${progress}% (${uploadedMB}MB/${fileSizeMB.toFixed(2)}MB)`)
    // })

    form.append('file', fileStream, { filename: fileName })

    const startTime = Date.now()
    console.log(`Starting upload of ${fileName} (${fileSizeMB.toFixed(2)} MB)`)

    const res = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })

    const result = res.data
    if (!result.success) throw new Error('Upload failed')

    const endTime = Date.now()
    const timeTaken = (endTime - startTime) / 1000
    const speedMBps = fileSizeMB / timeTaken

    console.log(`\nUpload Statistics:
    File Size: ${fileSizeMB.toFixed(2)} MB
    Time Taken: ${timeTaken.toFixed(2)} seconds
    Average Speed: ${speedMBps.toFixed(2)} MB/s
    Server Stats: ${JSON.stringify(result.stats, null, 2)}`)

    process.exit(0)
  } catch (err) {
    console.error(err?.response?.data || err)
    process.exit(1)
  }
}

main()
