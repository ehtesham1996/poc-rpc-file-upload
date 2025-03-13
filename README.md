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

## Approach 1 CENC Encoder

The client read file convert it to json with key and path along data and then encodes it and send over rpc
The server decodes the data and writes it to hyperDrive/Local

### Findings
- The file size is limited to 4MB
- For file size 1024 MB - 64 MB of memory it give javacsript heap out of memory error
- For file size 32 MB - 5MB it says channel closed but works fine when given 3MB file size
- For 3MB - 1MB it works fine

### Advantages
- Easy to implement
- Direct RPC Call

### Disadvantages
- File size is limited to 4MB

## Approach 2 Base64

The client read file convert it to base64 along with path and key and send it over rpc
The server decodes the data and writes it to hyperDrive/Local

### Findings
- The file size is limited to 10MB
- For file size 1024 MB - 64 MB of memory it give javacsript heap out of memory error
- For file size 32 MB - 5MB it says channel closed but works fine when given 10MB file size
- For 10MB - 1MB it works fine

### Advantages
- Easy to implement
- Direct RPC Call
- Native Library used no need to encode and decode

### Disadvantages
- File size is limited to 10MB
- Large Data sent over rpc is not reliable


## Approach 3 Http

The client passes the http or hyperDrive url to the server and server downloads the file
The server writes the file to hyperDrive/Local

For running client use the following command

```bash
node approach-3-http/client.js https://file-examples.com/storage/fef4c7c51867d2ced974d7e/2017/10/file-example_PDF_1MB.pdf
```

### Findings
- No limit on file size as the file is downloaded from the server
- Works fine for all file sizes

### Advantages
- No limit on file size
- Would be helpful in chain of rpc calls

### Disadvantages
- Need to have a server to download the file
- Need to have a public url to download the file
- File has to be uploaded to server before sending
- Need to implement relevant dataLoader from BaseDL


## Approach 4 Chunking

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
