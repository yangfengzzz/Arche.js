/**
 * @deprecated
 */
export enum GLCompressedTextureInternalFormat {
  // astc
  RGBA_ASTC_4X4_KHR = 0x93b0,
  RGBA_ASTC_5X4_KHR = 0x93b1,
  RGBA_ASTC_5X5_KHR = 0x93b2,
  RGBA_ASTC_6X5_KHR = 0x93b3,
  RGBA_ASTC_6X6_KHR = 0x93b4,
  RGBA_ASTC_8X5_KHR = 0x93b5,
  RGBA_ASTC_8X6_KHR = 0x93b6,
  RGBA_ASTC_8X8_KHR = 0x93b7,
  RGBA_ASTC_10X5_KHR = 0x93b8,
  RGBA_ASTC_10X6_KHR = 0x93b9,
  RGBA_ASTC_10X8_KHR = 0x93ba,
  RGBA_ASTC_10X10_KHR = 0x93bb,
  RGBA_ASTC_12X10_KHR = 0x93bc,
  RGBA_ASTC_12X12_KHR = 0x93bd,
  SRGB8_ALPHA8_ASTC_4X4_KHR = 0x93d0,
  SRGB8_ALPHA8_ASTC_5X4_KHR = 0x93d1,
  SRGB8_ALPHA8_ASTC_5X5_KHR = 0x93d2,
  SRGB8_ALPHA8_ASTC_6X5_KHR = 0x93d3,
  SRGB8_ALPHA8_ASTC_6X6_KHR = 0x93d4,
  SRGB8_ALPHA8_ASTC_8X5_KHR = 0x93d5,
  SRGB8_ALPHA8_ASTC_8X6_KHR = 0x93d6,
  SRGB8_ALPHA8_ASTC_8X8_KHR = 0x93d7,
  SRGB8_ALPHA8_ASTC_10X5_KHR = 0x93d8,
  SRGB8_ALPHA8_ASTC_10X6_KHR = 0x93d9,
  SRGB8_ALPHA8_ASTC_10X8_KHR = 0x93da,
  SRGB8_ALPHA8_ASTC_10X10_KHR = 0x93db,
  SRGB8_ALPHA8_ASTC_12X10_KHR = 0x93dc,
  SRGB8_ALPHA8_ASTC_12X12_KHR = 0x93dd,

  // etc1
  RGB_ETC1_WEBGL = 0x8d64,

  // etc2
  R11_EAC = 0x9270,
  SIGNED_R11_EAC = 0x9271,
  RG11_EAC = 0x9272,
  SIGNED_RG11_EAC = 0x9273,
  RGB8_ETC2 = 0x9274,
  SRGB8_ETC2 = 0x9275,
  RGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9276,
  SRGB8_PUNCHTHROUGH_ALPHA1_ETC2 = 0x9277,
  RGBA8_ETC2_EAC = 0x9278,
  SRGB8_ALPHA8_ETC2_EAC = 0x9279,

  // pvrtc
  RGB_PVRTC_4BPPV1_IMG = 0x8c00,
  RGB_PVRTC_2BPPV1_IMG = 0x8c01,
  RGBA_PVRTC_4BPPV1_IMG = 0x8c02,
  RGBA_PVRTC_2BPPV1_IMG = 0x8c03,

  // s3tc
  RGB_S3TC_DXT1_EXT = 0x83f0,
  RGBA_S3TC_DXT1_EXT = 0x83f1,
  RGBA_S3TC_DXT3_EXT = 0x83f2,
  RGBA_S3TC_DXT5_EXT = 0x83f3
}

export type CompressedTextureData = {
  internalFormat: GLCompressedTextureInternalFormat;
  width: number;
  height: number;
  mipmaps: Mipmap[];
  engineFormat: GPUTextureFormat;
};

export type CompressedCubeData = {
  engineFormat: GPUTextureFormat;
  internalFormat: number;
  width: number;
  height: number;
  mipmapsFaces: Mipmap[][];
};

export type Mipmap = {
  data: ArrayBufferView;
  width: number;
  height: number;
};

export type KTXContainer = {
  /**
   * origin buffer data
   */
  buffer: ArrayBuffer;
  /**
   * Gets the openGL type
   */
  glType: number;
  /**
   * Gets the openGL type size
   */
  glTypeSize: number;
  /**
   * Gets the openGL format
   */
  glFormat: number;
  /**
   * Gets the openGL internal format
   */
  glInternalFormat: number;
  /**
   * Gets the base internal format
   */
  glBaseInternalFormat: GLCompressedTextureInternalFormat;
  /**
   * Gets image width in pixel
   */
  pixelWidth: number;
  /**
   * Gets image height in pixel
   */
  pixelHeight: number;
  /**
   * Gets image depth in pixels
   */
  pixelDepth: number;
  /**
   * Gets the number of array elements
   */
  numberOfArrayElements: number;
  /**
   * Gets the number of faces
   */
  numberOfFaces: number;
  /**
   * Gets the number of mipmap levels
   */
  numberOfMipmapLevels: number;
  /**
   * Gets the bytes of key value data
   */
  bytesOfKeyValueData: number;
  /**
   * Gets the load type
   */
  loadType: number;
  /**
   * parsed mipmap data
   */
  mipmaps?: Mipmap[];
  /**
   * Oasis Engine native TextureFormat
   */
  engineFormat?: GPUTextureFormat;
};
