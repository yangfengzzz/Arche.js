export enum BufferUsage {
  MAP_READ = 1,
  MAP_WRITE = 2,
  COPY_SRC = 4,
  COPY_DST = 8,
  INDEX = 16,
  VERTEX = 32,
  UNIFORM = 64,
  STORAGE = 128,
  INDIRECT = 256,
  QUERY_RESOLVE = 512
}
