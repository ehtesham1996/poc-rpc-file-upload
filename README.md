# POC for writeFile over rpc network

## Description
This is a simple POC to demonstrate how to write a file over rpc network. The server will write the file to hyperDrive and the client will send the file


### FileWriter

Use the following command to create file of desired size

```bash
node fileWriter.js <fileSizeInMB> <fileName>
``` 

### Server and Client

Use the following command to start the server

```bash
node {approach}/server.js
```

copy the key and path from the server and use it in the client


Use the following command to start the client

```bash
node {approach}/client.js <filePath>
```
specify the file path to be sent to the server

## Approach 1 Chunking CENC

The client reads the file make a init call with metadata of file and sends it in chunks to the server
The server writes the file to hyperDrive/Local

### Findings
- No limit on file size as the file is sent in chunks
- Works fine for all file sizes
- Works fine for 1024 MB file size

### Advantages
- No limit on file size
- Works fine for large files
- Works fine for large data sent over rpc
- No need to have a server to download the file
- No need to have a public url to download the file

### Disadvantages
- Need to check how does this would work in our case with multiple rpc chaining calls

## Approach 2 Hyperswarm

The client initiates a transfer via RPC, then uses Hyperswarm for direct peer-to-peer file streaming
The server creates a writable stream to hyperDrive/Local and handles the incoming data stream

### Findings
- Works well for large files
- Direct P2P connection reduces server load
- Reliable streaming of data

### Advantages
- Efficient P2P file transfer
- Good for large files
- Streaming approach means low memory usage
- Built-in network resilience

### Disadvantages
- More complex setup
- Requires P2P networking setup
- Initial connection establishment takes time

## Approach 3 HTTP Multipart

The client uploads the file using HTTP multipart form data
The server handles the upload stream and writes to hyperDrive/Local

### Findings
- Works well for files up to configured size limit
- Familiar HTTP-based approach
- Good progress tracking

### Advantages
- Simple and standard approach
- Easy to implement
- Works with existing web infrastructure
- Good browser compatibility

### Disadvantages
- Requires HTTP server setup



# 📊 File Transfer Speed BenchMarks  

## Note 
These test were perfomed on `cosmicac-staging-gpu-01` and `dev-01` machines.
With server running on `cosmicac-staging-gpu-01` and client running on `dev-01`

| 📂 Filename and Size | 🔄 Chunking CENC (Max Chunk 4MB) | ⚡ Stream HyperSwarm | 🚀 HTTP Multipart (Fastify Server) |
|----------------------|--------------------------------|----------------------|----------------------------------|
| **File-1.txt (1MB)** | **Size:** 1.00MB <br> **⏳ Time:** 0.54s <br> **⚡ Speed:** 3.74 MB/s | **Size:** 1.00MB <br> **⏳ Time:** 0.32s <br> **⚡ Speed:** 3.13 MB/s | **Size:** 1.00MB <br> **⏳ Time:** 0.02s <br> **⚡ Speed:** 45.45 MB/s |
| **File-2.txt (2MB)** | **Size:** 2.00MB <br> **⏳ Time:** 0.81s <br> **⚡ Speed:** 2.46 MB/s | **Size:** 2.00MB <br> **⏳ Time:** 0.07s <br> **⚡ Speed:** 29.85 MB/s | **Size:** 2.00MB <br> **⏳ Time:** 0.02s <br> **⚡ Speed:** 90.91 MB/s |
| **File-4.txt (4MB)** | **Size:** 4.00MB <br> **⏳ Time:** 1.23s <br> **⚡ Speed:** 3.26 MB/s | **Size:** 4.00MB <br> **⏳ Time:** 0.09s <br> **⚡ Speed:** 45.98 MB/s | **Size:** 4.00MB <br> **⏳ Time:** 0.03s <br> **⚡ Speed:** 121.21 MB/s |
| **File-8.txt (8MB)** | **Size:** 8.00MB <br> **⏳ Time:** 2.23s <br> **⚡ Speed:** 3.59 MB/s | **Size:** 8.00MB <br> **⏳ Time:** 0.12s <br> **⚡ Speed:** 67.23 MB/s | **Size:** 8.00MB <br> **⏳ Time:** 0.06s <br> **⚡ Speed:** 145.45 MB/s |
| **File-16.txt (16MB)** | **Size:** 16.00MB <br> **⏳ Time:** 4.07s <br> **⚡ Speed:** 3.93 MB/s | **Size:** 16.00MB <br> **⏳ Time:** 0.19s <br> **⚡ Speed:** 82.47 MB/s | **Size:** 16.00MB <br> **⏳ Time:** 0.09s <br> **⚡ Speed:** 172.04 MB/s |
| **File-32.txt (32MB)** | **Size:** 32.00MB <br> **⏳ Time:** 7.89s <br> **⚡ Speed:** 4.06 MB/s | **Size:** 32.00MB <br> **⏳ Time:** 0.32s <br> **⚡ Speed:** 98.77 MB/s | **Size:** 32.00MB <br> **⏳ Time:** 0.16s <br> **⚡ Speed:** 201.26 MB/s |
| **File-64.txt (64MB)** | **Size:** 64.00MB <br> **⏳ Time:** 15.32s <br> **⚡ Speed:** 4.18 MB/s | **Size:** 64.00MB <br> **⏳ Time:** 0.63s <br> **⚡ Speed:** 102.40 MB/s | **Size:** 64.00MB <br> **⏳ Time:** 0.35s <br> **⚡ Speed:** 184.97 MB/s |
| **File-128.txt (128MB)** | **Size:** 128.00MB <br> **⏳ Time:** 29.61s <br> **⚡ Speed:** 4.32 MB/s | **Size:** 128.00MB <br> **⏳ Time:** 1.18s <br> **⚡ Speed:** 108.38 MB/s | **Size:** 128.00MB <br> **⏳ Time:** 0.64s <br> **⚡ Speed:** 201.26 MB/s |
| **File-256.txt (256MB)** | **Size:** 256.00MB <br> **⏳ Time:** 57.76s <br> **⚡ Speed:** 4.43 MB/s | **Size:** 256.00MB <br> **⏳ Time:** 2.32s <br> **⚡ Speed:** 110.44 MB/s | **Size:** 256.00MB <br> **⏳ Time:** 1.23s <br> **⚡ Speed:** 208.47 MB/s |
| **File-512.txt (512MB)** | **Size:** 512.00MB <br> **⏳ Time:** 118.32s <br> **⚡ Speed:** 4.33 MB/s | **Size:** 512.00MB <br> **⏳ Time:** 4.31s <br> **⚡ Speed:** 118.82 MB/s | **Size:** 512.00MB <br> **⏳ Time:** 1.78s <br> **⚡ Speed:** 287.16 MB/s |
| **File-1024.txt (1GB)** | **Size:** 1024.00MB <br> **⏳ Time:** 226.59s <br> **⚡ Speed:** 4.52 MB/s | **Size:** 1024.00MB <br> **⏳ Time:** 9.04s <br> **⚡ Speed:** 113.25 MB/s | **Size:** 1024.00MB <br> **⏳ Time:** 3.98s <br> **⚡ Speed:** 257.09 MB/s |

🚀 **Conclusion:**  
- **HTTP Multipart (Fastify Server)** is the fastest overall, achieving **257.09 MB/s** for a **1GB file**.  
- **Stream HyperSwarm** is significantly faster than **Chunking CENC**, but slower than HTTP Multipart.  
- **Chunking CENC** has a much lower speed across all file sizes, making it the least efficient method in this comparison.

