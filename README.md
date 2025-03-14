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
- Limited by HTTP server configurations
- Not as efficient as P2P approaches in terms of streaming but faster as compared to them



