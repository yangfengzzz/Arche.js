export enum Attributes {
  Position = 0,
  Normal,
  UV_0,
  Tangent,
  Bitangent,
  Color_0,
  Weights_0,
  Joints_0,
  UV_1,
  UV_2,
  UV_3,
  UV_4,
  UV_5,
  UV_6,
  UV_7,
  TOTAL_COUNT
}

export function attributesString(attr: Attributes): string {
  attr.toString();
  switch (attr) {
    case Attributes.Position:
      return "Position";
    case Attributes.Normal:
      return "Normal";
    case Attributes.UV_0:
      return "UV_0";
    case Attributes.Tangent:
      return "Tangent";
    case Attributes.Bitangent:
      return "Bitangent";
    case Attributes.Color_0:
      return "Color_0";
    case Attributes.Weights_0:
      return "Weights_0";
    case Attributes.Joints_0:
      return "Joints_0";
    case Attributes.UV_1:
      return "UV_1";
    case Attributes.UV_2:
      return "UV_2";
    case Attributes.UV_3:
      return "UV_3";
    case Attributes.UV_4:
      return "UV_4";
    case Attributes.UV_5:
      return "UV_5";
    case Attributes.UV_6:
      return "UV_6";
    case Attributes.UV_7:
      return "UV_7";
    default:
      throw "Unknown attribute";
  }
}

export type UniformType =
  | "f32"
  | "i32"
  | "u32"
  | "vec2<f32>"
  | "vec2<i32>"
  | "vec2<u32>"
  | "vec3<f32>"
  | "vec3<i32>"
  | "vec3<u32>"
  | "vec4<f32>"
  | "vec4<i32>"
  | "vec4<u32>"
  | "mat2x2<f32>"
  | "mat3x2<f32>"
  | "mat4x2<f32>"
  | "mat2x3<f32>"
  | "mat3x3<f32>"
  | "mat4x3<f32>"
  | "mat2x4<f32>"
  | "mat3x4<f32>"
  | "mat4x4<f32>";

export type TextureType =
  | "texture_1d<f32>"
  | "texture_1d<i32>"
  | "texture_1d<u32>"
  | "texture_2d<f32>"
  | "texture_2d<i32>"
  | "texture_2d<u32>"
  | "texture_2d_array<f32>"
  | "texture_2d_array<i32>"
  | "texture_2d_array<u32>"
  | "texture_3d<f32>"
  | "texture_3d<i32>"
  | "texture_3d<u32>"
  | "texture_cube<f32>"
  | "texture_cube<i32>"
  | "texture_cube<u32>"
  | "texture_cube_array<f32>"
  | "texture_cube_array<i32>"
  | "texture_cube_array<u32>"
  | "texture_multisampled_2d<f32>"
  | "texture_multisampled_2d<i32>"
  | "texture_multisampled_2d<u32>"
  | "texture_depth_2d"
  | "texture_depth_2d_array"
  | "texture_depth_cube"
  | "texture_depth_cube_array"
  | "texture_depth_multisampled_2d";

export function isMultisampled(type: TextureType): boolean {
  return (
    type == "texture_multisampled_2d<f32>" ||
    type == "texture_multisampled_2d<i32>" ||
    type == "texture_multisampled_2d<u32>"
  );
}

export function textureViewDimension(type: TextureType): GPUTextureViewDimension {
  switch (type) {
    case "texture_1d<f32>":
    case "texture_1d<i32>":
    case "texture_1d<u32>":
      return "1d";

    case "texture_2d<f32>":
    case "texture_2d<i32>":
    case "texture_2d<u32>":
    case "texture_multisampled_2d<f32>":
    case "texture_multisampled_2d<i32>":
    case "texture_multisampled_2d<u32>":
    case "texture_depth_2d":
    case "texture_depth_multisampled_2d":
      return "2d";

    case "texture_2d_array<f32>":
    case "texture_2d_array<i32>":
    case "texture_2d_array<u32>":
    case "texture_depth_2d_array":
      return "2d-array";

    case "texture_3d<f32>":
    case "texture_3d<i32>":
    case "texture_3d<u32>":
      return "3d";

    case "texture_cube<f32>":
    case "texture_cube<i32>":
    case "texture_cube<u32>":
    case "texture_depth_cube":
      return "cube";

    case "texture_cube_array<f32>":
    case "texture_cube_array<i32>":
    case "texture_cube_array<u32>":
    case "texture_depth_cube_array":
      return "cube-array";

    default:
      break;
  }
}

export function sampleType(type: TextureType): GPUTextureSampleType {
  switch (type) {
    case "texture_1d<f32>":
    case "texture_2d<f32>":
    case "texture_2d_array<f32>":
    case "texture_3d<f32>":
    case "texture_cube<f32>":
    case "texture_cube_array<f32>":
    case "texture_multisampled_2d<f32>":
      return "float";

    case "texture_1d<i32>":
    case "texture_2d<i32>":
    case "texture_2d_array<i32>":
    case "texture_3d<i32>":
    case "texture_cube<i32>":
    case "texture_cube_array<i32>":
    case "texture_multisampled_2d<i32>":
      return "sint";

    case "texture_1d<u32>":
    case "texture_2d<u32>":
    case "texture_2d_array<u32>":
    case "texture_3d<u32>":
    case "texture_cube<u32>":
    case "texture_cube_array<u32>":
    case "texture_multisampled_2d<u32>":
      return "uint";

    case "texture_depth_2d":
    case "texture_depth_2d_array":
    case "texture_depth_cube":
    case "texture_depth_cube_array":
    case "texture_depth_multisampled_2d":
      return "depth";

    default:
      break;
  }
}

export type SamplerType = "sampler" | "sampler_comparison";

export function bindingType(type: SamplerType): GPUSamplerBindingType {
  switch (type) {
    case "sampler":
      return "filtering";

    case "sampler_comparison":
      return "comparison";

    default:
      break;
  }
}

export type StorageTextureType =
  | "texture_storage_1d"
  | "texture_storage_2d"
  | "texture_storage_2d_array"
  | "texture_storage_3d";

export function storageTextureViewDimension(type: StorageTextureType): GPUTextureViewDimension {
  switch (type) {
    case "texture_storage_1d":
      return "1d";
    case "texture_storage_2d":
      return "2d";
    case "texture_storage_2d_array":
      return "2d-array";
    case "texture_storage_3d":
      return "3d";

    default:
      break;
  }
}

export type BuiltInType =
  | "vertex_index"
  | "instance_index"
  | "position"
  | "front_facing"
  | "frag_depth"
  | "local_invocation_id"
  | "local_invocation_index"
  | "global_invocation_id"
  | "workgroup_id"
  | "num_workgroups"
  | "sample_index"
  | "sample_mask";
