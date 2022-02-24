struct CubeShadowData {
     bias:f32;
     intensity:f32;
     radius:f32;
     dump:f32;
     vp:array<mat4x4<f32>, 6>;
     lightPos:vec3<f32>;
};

fn convertUVToDirection( face:i32,  uv:vec2<f32>)->vec3<f32> {
    var u = 2.0 * uv.x - 1.0;
    var v = -2.0 * uv.y + 1.0;
    
    let offsets = array<vec3<f32>, 6>(
        vec3<f32>(1.0, v, -u),
        vec3<f32>(-1.0, v, u),
        vec3<f32>(u, 1.0, -v),
        vec3<f32>(u, -1.0, v),
        vec3<f32>(u, v, 1.0),
        vec3<f32>(-u, v, -1.0),
    );
    return offsets[face];
}

fn cubeTextureProj( worldPos:vec3<f32>, off:vec2<f32>, u_cubeShadowData: CubeShadowData, index: i32,
                    u_cubeShadowMap: texture_depth_cube_array, u_cubeShadowSampler: sampler_comparison)->f32 {
    var direction = worldPos - u_cubeShadowData.lightPos;
    var scale = 1.0 / max(max(abs(direction.x), abs(direction.y)), abs(direction.z));
    direction = direction * scale;
    var faceIndex = 0;
    if (abs(direction.x - 1.0) < 1.0e-3) {
        faceIndex = 0;
    } else if (abs(direction.x + 1.0) < 1.0e-3) {
        faceIndex = 1;
    }  else if (abs(direction.y - 1.0) < 1.0e-3) {
        faceIndex = 2;
    } else if (abs(direction.y + 1.0) < 1.0e-3) {
        faceIndex = 3;
    } else if (abs(direction.z - 1.0) < 1.0e-3) {
        faceIndex = 4;
    } else if (abs(direction.z + 1.0) < 1.0e-3) {
        faceIndex = 5;
    }
    
    var shadowCoord = u_cubeShadowData.vp[faceIndex] * vec4<f32>(worldPos, 1.0);
    var xy = shadowCoord.xy;
    xy = xy / shadowCoord.w;
    xy = xy * 0.5 + 0.5;
    xy.y = 1.0 - xy.y;
    var dir = convertUVToDirection(faceIndex, xy + off);
    
    var shadow_sample = textureSampleCompare(u_cubeShadowMap, u_cubeShadowSampler, dir, index, shadowCoord.z / shadowCoord.w);
    return select(1.0, u_cubeShadowData.intensity, shadow_sample < 1.0);
}

fn cubeFilterPCF( worldPos:vec3<f32>,  u_cubeShadowData: CubeShadowData, index: i32,
                  u_cubeShadowMap: texture_depth_cube_array, u_cubeShadowSampler: sampler_comparison)->f32 {
    var direction = worldPos - u_cubeShadowData.lightPos;
    var scale = 1.0 / max(max(abs(direction.x), abs(direction.y)), abs(direction.z));
    direction = direction * scale;
    var faceIndex = 0;
    if (abs(direction.x - 1.0) < 1.0e-3) {
        faceIndex = 0;
    } else if (abs(direction.x + 1.0) < 1.0e-3) {
        faceIndex = 1;
    }  else if (abs(direction.y - 1.0) < 1.0e-3) {
        faceIndex = 2;
    } else if (abs(direction.y + 1.0) < 1.0e-3) {
        faceIndex = 3;
    } else if (abs(direction.z - 1.0) < 1.0e-3) {
        faceIndex = 4;
    } else if (abs(direction.z + 1.0) < 1.0e-3) {
        faceIndex = 5;
    }
    
    var shadowCoord = u_cubeShadowData.vp[faceIndex] * vec4<f32>(worldPos, 1.0);
    var xy = shadowCoord.xy;
    xy = xy / shadowCoord.w;
    xy = xy * 0.5 + 0.5;
    xy.y = 1.0 - xy.y;
    
    let neighborWidth = 3.0;
    let neighbors = (neighborWidth * 2.0 + 1.0) * (neighborWidth * 2.0 + 1.0);
    let mapSize = 4096.0;
    let texelSize = 1.0 / mapSize;
    var total = 0.0;
    for (var x = -neighborWidth; x <= neighborWidth; x = x + 1.0) {
        for (var y = -neighborWidth; y <= neighborWidth; y = y + 1.0) {
            var dir = convertUVToDirection(faceIndex, xy + vec2<f32>(x, y) * texelSize);
            var shadow_sample = textureSampleCompare(u_cubeShadowMap, u_cubeShadowSampler, dir, index, shadowCoord.z / shadowCoord.w);
            total = total + select(1.0, u_cubeShadowData.intensity, shadow_sample < 1.0);
        }
    }
    return total / neighbors;
}