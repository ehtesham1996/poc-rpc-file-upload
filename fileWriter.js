const fs = require('fs');
const path = require('path');
const { argv } = require('process');

const FILE_SIZE_IN_MB = argv[2] || 1024;
const FILE_NAME = argv[3] || `sample-file-${FILE_SIZE_IN_MB}.txt`;

const filePath = path.join(__dirname, 'files', FILE_NAME);
const fileStream = fs.createWriteStream(filePath, { flags: 'w' });


const CHUNK_SIZE = 1024 * 1024; // 1MB per chunk
const TOTAL_SIZE = 1024 * 1024 * FILE_SIZE_IN_MB; // 1GB total
const SAMPLE_TEXT = 'This is a sample line of text.\n';
const SAMPLE_TEXT_SIZE = Buffer.byteLength(SAMPLE_TEXT);
const LINES_PER_CHUNK = Math.floor(CHUNK_SIZE / SAMPLE_TEXT_SIZE);

let written = 0;

function writeChunk() {
  let ok = true;
  while (written < TOTAL_SIZE && ok) {
    let chunk = '';
    for (let i = 0; i < LINES_PER_CHUNK; i++) {
      chunk += SAMPLE_TEXT;
    }
    written += Buffer.byteLength(chunk);
    if (written >= TOTAL_SIZE) {
      fileStream.end(chunk);
      console.log('File writing completed.');
    } else {
      ok = fileStream.write(chunk);
    }
  }
  if (written < TOTAL_SIZE) {
    fileStream.once('drain', writeChunk);
  }
}

writeChunk();