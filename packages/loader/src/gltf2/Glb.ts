// https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification-general

// Simple number test to see if its a GLB
const GLB_MAGIC = 0x46546c67;
// Chunk Type for JSON
const GLB_JSON = 0x4e4f534a;
// Chunk Type for Binary
const GLB_BIN = 0x004e4942;
// Version Number
const GLB_VER = 2;
// Byte Index for magic Uint32 magic value
const GLB_MAGIC_BIDX = 0;
// Byte Index for version Uint32 Value
const GLB_VERSION_BIDX = 4;
// Byte Index for Chunk0 Type
const GLB_JSON_TYPE_BIDX = 16;
// Byte Index for Chunk0 ByteLength ( Start of Header )
const GLB_JSON_LEN_BIDX = 12;
// Byte Index for the start of Chunk0
const GLB_JSON_BIDX = 20;

async function parseGLB(res: Response): Promise<[JSON, ArrayBuffer] | null> {
  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const arybuf = await res.arrayBuffer();
  const dv = new DataView(arybuf);

  if (dv.getUint32(GLB_MAGIC_BIDX, true) != GLB_MAGIC) {
    console.error("GLB magic number does not match.");
    return null;
  }
  if (dv.getUint32(GLB_VERSION_BIDX, true) != GLB_VER) {
    console.error("Can only accept GLB of version 2.");
    return null;
  }
  if (dv.getUint32(GLB_JSON_TYPE_BIDX, true) != GLB_JSON) {
    console.error("GLB Chunk 0 is not the type: JSON ");
    return null;
  }

  // Byte Length of Chunk0-JSON
  const json_len = dv.getUint32(GLB_JSON_LEN_BIDX, true);
  // Byte Index for Chunk1's Header ( Also Chunk1's ByteLength )
  const chk1_bidx = GLB_JSON_BIDX + json_len;

  // TODO: This isn't actually required, can have GLTF without Binary Chunk
  if (dv.getUint32(chk1_bidx + 4, true) != GLB_BIN) {
    console.error("GLB Chunk 1 is not the type: BIN ");
    return null;
  }

  // Get Length of Binary Chunk
  const bin_len = dv.getUint32(chk1_bidx, true);
  // Skip the 2 INT header values to get the byte index start of BIN
  const bin_idx = chk1_bidx + 8;

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // PARSE JSON
  // JSON is encoded with uf8
  const txt_decoder = new TextDecoder("utf8");
  // Slice the Byte Array to just have the JSON Chunk
  const json_bytes = new Uint8Array(arybuf, GLB_JSON_BIDX, json_len);
  // Decode Byte Array Slice
  const json_text = txt_decoder.decode(json_bytes);
  // Parse Text to JSON Objects
  const json = JSON.parse(json_text);

  //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // PARSE BIN - TODO, Not efficient to slice the array buffer
  // Ideally better to save start index as a starting offset
  // & fix the parser to tack that value onto every accessor call

  const bin = arybuf.slice(bin_idx);
  if (bin.byteLength != bin_len) {
    console.error("GLB Bin length does not match value in header.");
    return null;
  }

  return [json, bin];
}

export default parseGLB;
