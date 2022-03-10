export enum BufferUsage {
  MAP_READ = GPUBufferUsage.MAP_READ,
  MAP_WRITE = GPUBufferUsage.MAP_WRITE,
  COPY_SRC = GPUBufferUsage.COPY_SRC,
  COPY_DST = GPUBufferUsage.COPY_DST,
  INDEX = GPUBufferUsage.INDEX,
  VERTEX = GPUBufferUsage.VERTEX,
  UNIFORM = GPUBufferUsage.UNIFORM,
  STORAGE = GPUBufferUsage.STORAGE,
  INDIRECT = GPUBufferUsage.INDIRECT,
  QUERY_RESOLVE = GPUBufferUsage.QUERY_RESOLVE
}
