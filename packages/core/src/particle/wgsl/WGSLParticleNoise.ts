import { WGSLEncoder } from "../../shaderlib";
import { ShaderMacroCollection } from "../../shader";

export class WGSLParticleNoise {
  execute(encoder: WGSLEncoder, macros: ShaderMacroCollection) {
    encoder.addFunction(
      "// Fast computation of x modulo 289\n" +
        "fn mod289Vec3(x: vec3<f32>) -> vec3<f32> {\n" +
        "    return x - floor(x * (1.0 / 289.0)) * 289.0;\n" +
        "}\n" +
        "\n" +
        "fn mod289Vec4(x: vec4<f32>) -> vec4<f32> {\n" +
        "    return x - floor(x * (1.0 / 289.0)) * 289.0;\n" +
        "}\n" +
        "\n" +
        "// Compute indices for the PRNG\n" +
        "fn permute(x: vec4<f32>, uPerlinNoisePermutationSeed: f32) -> vec4<f32> {\n" +
        "    return mod289Vec4(((x*34.0)+1.0)*x + vec4<f32>(uPerlinNoisePermutationSeed));\n" +
        "}\n" +
        "\n" +
        "// Quintic interpolant\n" +
        "fn fadeVec2(u: vec2<f32>) -> vec2<f32> {\n" +
        "    return u*u*u*(u*(u*6.0 - 15.0) + 10.0);\n" +
        "    \n" +
        "    // Original cubic interpolant (faster, but not 2nd order derivable)\n" +
        "    //return u*u*(3.0f - 2.0f*u);\n" +
        "}\n" +
        "\n" +
        "fn fadeVec3(u: vec3<f32>) -> vec3<f32> {\n" +
        "    return u*u*u*(u*(u*6.0 - 15.0) + 10.0);\n" +
        "}\n" +
        "\n" +
        "fn normalizeNoise(n: f32) -> f32 {\n" +
        "    // return noise in [0, 1]\n" +
        "    return 0.5*(2.44*n + 1.0);\n" +
        "}\n" +
        "\n" +
        "\n" +
        "///////////////////////////////////////////////////////////////////////////////////////////////////\n" +
        "fn pnoise_gradients(pt: vec2<f32>, uPerlinNoisePermutationSeed: f32, gradients: ptr<function, vec4<f32> >, fpt: ptr<function, vec4<f32> >) {\n" +
        "    // Retrieve the integral part (for indexation)\n" +
        "    var ipt = floor(pt.xyxy) + vec4<f32>(0.0, 0.0, 1.0, 1.0);\n" +
        "    \n" +
        "    ipt = mod289Vec4(ipt);\n" +
        "    \n" +
        "    // Compute the 4 corners hashed gradient indices\n" +
        "    let ix = ipt.xzxz;\n" +
        "    let iy = ipt.yyww;\n" +
        "    let p = permute(permute(ix, uPerlinNoisePermutationSeed) + iy, uPerlinNoisePermutationSeed);\n" +
        "    \n" +
        "    // Fast version for :\n" +
        "    // p.x = P(P(ipt.x)      + ipt.y);\n" +
        "    // p.y = P(P(ipt.x+1.0f) + ipt.y);\n" +
        "    // p.z = P(P(ipt.x)      + ipt.y+1.0f);\n" +
        "    // p.w = P(P(ipt.x+1.0f) + ipt.y+1.0f);\n" +
        "    \n" +
        "    // With 'p', computes Pseudo Random Numbers\n" +
        "    let one_over_41 = 1.0 / 41.0; //0.02439f\n" +
        "    var gx = 2.0 * fract(p * one_over_41) - 1.0;\n" +
        "    let gy = abs(gx) - 0.5;\n" +
        "    let tx = floor(gx + 0.5);\n" +
        "    gx = gx - tx;\n" +
        "    \n" +
        "    // Create unnormalized gradients\n" +
        "    var g00 = vec2<f32>(gx.x,gy.x);\n" +
        "    var g10 = vec2<f32>(gx.y,gy.y);\n" +
        "    var g01 = vec2<f32>(gx.z,gy.z);\n" +
        "    var g11 = vec2<f32>(gx.w,gy.w);\n" +
        "    \n" +
        "    // 'Fast' normalization\n" +
        "    let dp = vec4<f32>(dot(g00, g00), dot(g10, g10), dot(g01, g01), dot(g11, g11));\n" +
        "    let norm = inverseSqrt(dp);\n" +
        "    g00 = g00 * norm.x;\n" +
        "    g10 = g10 * norm.y;\n" +
        "    g01 = g01 * norm.z;\n" +
        "    g11 = g11 * norm.w;\n" +
        "    \n" +
        "    // Retrieve the fractional part (for interpolation)\n" +
        "    *fpt = fract(pt.xyxy) - vec4<f32>(0.0, 0.0, 1.0, 1.0);\n" +
        "    \n" +
        "    // Calculate gradient's influence\n" +
        "    let fx = (*fpt).xzxz;\n" +
        "    let fy = (*fpt).yyww;\n" +
        "    let n00 = dot(g00, vec2<f32>(fx.x, fy.x));\n" +
        "    let n10 = dot(g10, vec2<f32>(fx.y, fy.y));\n" +
        "    let n01 = dot(g01, vec2<f32>(fx.z, fy.z));\n" +
        "    let n11 = dot(g11, vec2<f32>(fx.w, fy.w));\n" +
        "\n" +
        "    // Fast version for :\n" +
        "    // n00 = dot(g00, fpt + vec2(0.0f, 0.0f));\n" +
        "    // n10 = dot(g10, fpt + vec2(-1.0f, 0.0f));\n" +
        "    // n01 = dot(g01, fpt + vec2(0.0f,-1.0f));\n" +
        "    // n11 = dot(g11, fpt + vec2(-1.0f,-1.0f));\n" +
        "    \n" +
        "    *gradients = vec4<f32>(n00, n10, n01, n11);\n" +
        "}\n" +
        "\n" +
        "// Classical Perlin Noise 2D\n" +
        "fn pnoise2D(pt: vec2<f32>, uPerlinNoisePermutationSeed: f32) -> f32 {\n" +
        "    var g:vec4<f32>;\n" +
        "    var fpt:vec4<f32>;\n" +
        "    pnoise_gradients(pt, uPerlinNoisePermutationSeed, &g, &fpt);\n" +
        "    \n" +
        "    // Interpolate gradients\n" +
        "    let u = fadeVec2(fpt.xy);\n" +
        "    let n1 = mix(g.x, g.y, u.x);\n" +
        "    let n2 = mix(g.z, g.w, u.x);\n" +
        "    let noise = mix(n1, n2, u.y);\n" +
        "    \n" +
        "    return noise;\n" +
        "}\n" +
        "\n" +
        "// Derivative Perlin Noise 2D\n" +
        "fn dpnoise(pt: vec2<f32>, uPerlinNoisePermutationSeed: f32) -> vec3<f32> {\n" +
        "    var g:vec4<f32>;\n" +
        "    var fpt:vec4<f32>;\n" +
        "    pnoise_gradients(pt, uPerlinNoisePermutationSeed, &g, &fpt);\n" +
        "    \n" +
        "    let k0 = g.x;\n" +
        "    let k1 = g.y - g.x;\n" +
        "    let k2 = g.z - g.x;\n" +
        "    let k3 = g.x - g.z - g.y + g.w;\n" +
        "    var res = vec3<f32>(0.0);\n" +
        "    \n" +
        "    let u = fadeVec2(fpt.xy);\n" +
        "    res.x = k0 + k1*u.x + k2*u.y + k3*u.x*u.y;\n" +
        "    \n" +
        "    let dpt = 30.0*fpt.xy*fpt.xy*(fpt.xy*(fpt.xy - 2.0) + 1.0);\n" +
        "    res.y = dpt.x * (k1 + k3*u.y);\n" +
        "    res.z = dpt.y * (k2 + k3*u.x);\n" +
        "    \n" +
        "    return res;\n" +
        "}\n" +
        "\n" +
        "// Classical Perlin Noise fbm 2D\n" +
        "fn fbm_pnoise2D(pt: vec2<f32>, zoom: f32, numOctave: u32, frequency: f32, amplitude: f32, uPerlinNoisePermutationSeed: f32) -> f32 {\n" +
        "    var sum = 0.0;\n" +
        "    var f = frequency;\n" +
        "    var w = amplitude;\n" +
        "    \n" +
        "    let v = zoom * pt;\n" +
        "    \n" +
        "    for (var i = 0u; i < numOctave; i = i + 1u) {\n" +
        "        sum = sum + w * pnoise2D(f*v, uPerlinNoisePermutationSeed);\n" +
        "        f = f * frequency;\n" +
        "        w = f * amplitude;\n" +
        "    }\n" +
        "    \n" +
        "    return sum;\n" +
        "}\n" +
        "\n" +
        "// Derivative Perlin Noise fbm 2D\n" +
        "fn fbm_pnoise_derivative(pt: vec2<f32>, zoom: f32, numOctave: u32, frequency: f32, amplitude: f32, uPerlinNoisePermutationSeed: f32) -> f32 {\n" +
        "    var sum = 0.0;\n" +
        "    var f = frequency;\n" +
        "    var w = amplitude;\n" +
        "\n" +
        "    var dn = vec2<f32>(0.0);\n" +
        "    \n" +
        "    let v = zoom * pt;\n" +
        "    \n" +
        "    for (var i = 0u; i < numOctave; i = i + 1u) {\n" +
        "        let n = dpnoise(f*v, uPerlinNoisePermutationSeed);\n" +
        "        dn = dn + n.yz;\n" +
        "        \n" +
        "        let crestFactor = 1.0 / (1.0 + dot(dn,dn));\n" +
        "        \n" +
        "        sum = sum + w * n.x * crestFactor;\n" +
        "        f = f * frequency;\n" +
        "        w = w * amplitude;\n" +
        "    }\n" +
        "    \n" +
        "    return sum;\n" +
        "}\n" +
        "\n" +
        "///////////////////////////////////////////////////////////////////////////////////////////////////\n" +
        "// Classical Perlin Noise 3D\n" +
        "fn pnoise3D(pt: vec3<f32>, uPerlinNoisePermutationSeed: f32) -> f32 {\n" +
        "    // Retrieve the integral part (for indexation)\n" +
        "    var ipt0 = floor(pt);\n" +
        "    var ipt1 = ipt0 + vec3<f32>(1.0);\n" +
        "    \n" +
        "    ipt0 = mod289Vec3(ipt0);\n" +
        "    ipt1 = mod289Vec3(ipt1);\n" +
        "    \n" +
        "    // Compute the 8 corners hashed gradient indices\n" +
        "    let ix = vec4<f32>(ipt0.x, ipt1.x, ipt0.x, ipt1.x);\n" +
        "    let iy = vec4<f32>(ipt0.yy, ipt1.yy);\n" +
        "    let p = permute(permute(ix, uPerlinNoisePermutationSeed) + iy, uPerlinNoisePermutationSeed);\n" +
        "    let p0 = permute(p + ipt0.zzzz, uPerlinNoisePermutationSeed);\n" +
        "    let p1 = permute(p + ipt1.zzzz, uPerlinNoisePermutationSeed);\n" +
        "    \n" +
        "    // Compute Pseudo Random Numbers\n" +
        "    var gx0 = p0 * (1.0 / 7.0);\n" +
        "    var gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;\n" +
        "    gx0 = fract(gx0);\n" +
        "    let gz0 = vec4<f32>(0.5) - abs(gx0) - abs(gy0);\n" +
        "    let sz0 = step(gz0, vec4<f32>(0.0));\n" +
        "    gx0 = gx0 - sz0 * (step(vec4<f32>(0.0), gx0) - 0.5);\n" +
        "    gy0 = gy0 - sz0 * (step(vec4<f32>(0.0), gy0) - 0.5);\n" +
        "    \n" +
        "    var gx1 = p1 * (1.0 / 7.0);\n" +
        "    var gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;\n" +
        "    gx1 = fract(gx1);\n" +
        "    let gz1 = vec4<f32>(0.5) - abs(gx1) - abs(gy1);\n" +
        "    let sz1 = step(gz1, vec4<f32>(0.0));\n" +
        "    gx1 = gx1 - sz1 * (step(vec4<f32>(0.0), gx1) - 0.5);\n" +
        "    gy1 = gy1 - sz1 * (step(vec4<f32>(0.0), gy1) - 0.5);\n" +
        "    \n" +
        "    \n" +
        "    // Create unnormalized gradients\n" +
        "    var g000 = vec3<f32>(gx0.x, gy0.x, gz0.x);\n" +
        "    var g100 = vec3<f32>(gx0.y, gy0.y, gz0.y);\n" +
        "    var g010 = vec3<f32>(gx0.z, gy0.z, gz0.z);\n" +
        "    var g110 = vec3<f32>(gx0.w, gy0.w, gz0.w);\n" +
        "    var g001 = vec3<f32>(gx1.x, gy1.x, gz1.x);\n" +
        "    var g101 = vec3<f32>(gx1.y, gy1.y, gz1.y);\n" +
        "    var g011 = vec3<f32>(gx1.z, gy1.z, gz1.z);\n" +
        "    var g111 = vec3<f32>(gx1.w, gy1.w, gz1.w);\n" +
        "    \n" +
        "    // 'Fast' normalization\n" +
        "    var dp = vec4<f32>(dot(g000, g000), dot(g100, g100), dot(g010, g010), dot(g110, g110));\n" +
        "    var norm = inverseSqrt(dp);\n" +
        "    g000 = g000 * norm.x;\n" +
        "    g100 = g100 * norm.y;\n" +
        "    g010 = g010 * norm.z;\n" +
        "    g110 = g110 * norm.w;\n" +
        "    \n" +
        "    dp = vec4<f32>(dot(g001, g001), dot(g101, g101), dot(g011, g011), dot(g111, g111));\n" +
        "    norm = inverseSqrt(dp);\n" +
        "    g001 = g001 * norm.x;\n" +
        "    g101 = g101 * norm.y;\n" +
        "    g011 = g011 * norm.z;\n" +
        "    g111 = g111 * norm.w;\n" +
        "    \n" +
        "    // Retrieve the fractional part (for interpolation)\n" +
        "    let fpt0 = fract(pt);\n" +
        "    let fpt1 = fpt0 - vec3<f32>(1.0);\n" +
        "    \n" +
        "    // Calculate gradient's influence\n" +
        "    let n000 = dot(g000, fpt0);\n" +
        "    let n100 = dot(g100, vec3<f32>(fpt1.x, fpt0.yz));\n" +
        "    let n010 = dot(g010, vec3<f32>(fpt0.x, fpt1.y, fpt0.z));\n" +
        "    let n110 = dot(g110, vec3<f32>(fpt1.xy, fpt0.z));\n" +
        "    let n001 = dot(g001, vec3<f32>(fpt0.xy, fpt1.z));\n" +
        "    let n101 = dot(g101, vec3<f32>(fpt1.x, fpt0.y, fpt1.z));\n" +
        "    let n011 = dot(g011, vec3<f32>(fpt0.x, fpt1.yz));\n" +
        "    let n111 = dot(g111, fpt1);\n" +
        "    \n" +
        "    // Interpolate gradients\n" +
        "    let u = fadeVec3(fpt0);\n" +
        "    let nxy0 = mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y);\n" +
        "    let nxy1 = mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y);\n" +
        "    let noise = mix(nxy0, nxy1, u.z);\n" +
        "    \n" +
        "    return noise;\n" +
        "}\n" +
        "\n" +
        "// Classical Perlin Noise 2D + time\n" +
        "fn pnoise_loop(u: vec2<f32>, dt: f32, uPerlinNoisePermutationSeed: f32) -> f32 {\n" +
        "    let pt1 = vec3<f32>(u, dt);\n" +
        "    let pt2 = vec3<f32>(u, dt - 1.0);\n" +
        "    \n" +
        "    return mix(pnoise3D(pt1, uPerlinNoisePermutationSeed), pnoise3D(pt2, uPerlinNoisePermutationSeed), dt);\n" +
        "}\n" +
        "\n" +
        "// Classical Perlin Noise fbm 3D\n" +
        "fn fbm_pnoise3D(pt: vec3<f32>, zoom: f32, numOctave: u32, frequency: f32, amplitude: f32, uPerlinNoisePermutationSeed: f32) -> f32 {\n" +
        "    var sum = 0.0;\n" +
        "    var f = frequency;\n" +
        "    var w = amplitude;\n" +
        "    \n" +
        "    let v = zoom * pt;\n" +
        "    \n" +
        "    for (var i = 0u; i < numOctave; i = i + 1u) {\n" +
        "        sum = sum + w * pnoise3D(f*v, uPerlinNoisePermutationSeed);\n" +
        "        \n" +
        "        f = f * frequency;\n" +
        "        w = w * amplitude;\n" +
        "    }\n" +
        "    \n" +
        "    return sum;\n" +
        "}\n" +
        "\n" +
        "fn fbm3D(ws: vec3<f32>, uPerlinNoisePermutationSeed: f32) -> f32 {\n" +
        "    let N = 128.0;\n" +
        "    let zoom = 1.0 / N;\n" +
        "    let octave = 4u;\n" +
        "    let freq = 2.0;\n" +
        "    let w = 0.45;\n" +
        "    \n" +
        "    return N * fbm_pnoise3D(ws, zoom, octave, freq, w, uPerlinNoisePermutationSeed);\n" +
        "}\n"
    );

    encoder.addFunction(
      "fn smoothstep_2(edge0: f32, edge1: f32, x: f32) -> f32 {\n" +
        "    let t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);\n" +
        "    return t * t * t * (10.0 + t *(-15.0 + 6.0 * t));\n" +
        "}\n" +
        "\n" +
        "fn ramp(x: f32) -> f32 {\n" +
        "    return smoothstep_2(-1.0, 1.0, x) * 2.0 - 1.0;\n" +
        "}\n" +
        "\n" +
        "fn noise3d(seed: vec3<f32>, uPerlinNoisePermutationSeed: f32) -> vec3<f32> {\n" +
        "    return vec3<f32>(pnoise3D(seed, uPerlinNoisePermutationSeed),\n" +
        "                  pnoise3D(seed + vec3<f32>(31.416, -47.853, 12.793), uPerlinNoisePermutationSeed),\n" +
        "                  pnoise3D(seed + vec3<f32>(-233.145, -113.408, -185.31), uPerlinNoisePermutationSeed));\n" +
        "}\n" +
        "\n" +
        "fn match_boundary(inv_noise_scale: f32, d: f32, normal: vec3<f32>, psi: ptr<function, vec3<f32> >) {\n" +
        "    let alpha = ramp(abs(d) * inv_noise_scale);\n" +
        "    let dp = dot(*psi, normal);\n" +
        "    *psi = mix(dp * normal, *psi, alpha);\n" +
        "}\n" +
        "\n" +
        "// [ User customized sampling function ]\n" +
        "fn sample_potential(p:vec3<f32>, uPerlinNoisePermutationSeed:f32)->vec3<f32> {\n" +
        "    let num_octaves = 4u;\n" +
        "    \n" +
        "    // Potential\n" +
        "    var psi = vec3<f32>(0.0);\n" +
        "    \n" +
        "    // Compute normal and retrieve distance from colliders.\n" +
        "    var normal = vec3<f32>(0.0);\n" +
        "    let distance = compute_gradient(p, &normal);\n" +
        "    \n" +
        "\n" +
        "    // let PlumeCeiling = 0.0;\n" +
        "    // let PlumeBase = -3.0;\n" +
        "    // let PlumeHeight = 80.0;\n" +
        "    // let RingRadius = 10.25;\n" +
        "    // let RingSpeed = 0.3;\n" +
        "    // let RingsPerSecond = 0.125;\n" +
        "    // let RingMagnitude = 10.0;\n" +
        "    // let RingFalloff = 0.7;\n" +
        "\n" +
        "    \n" +
        "    var height_factor = 1.0;//ramp((p.y - PlumeBase)/ PlumeHeight);\n" +
        "    \n" +
        "    // Add turbulence octaves that respects boundaries.\n" +
        "    var noise_gain = 1.0;\n" +
        "    for(var i = 0u; i < num_octaves; i = i + 1u) {\n" +
        "        // const float noise_scale = 0.42f * noise_gain;\n" +
        "        let inv_noise_scale = 1.0 / noise_gain;\n" +
        "        \n" +
        "        let s = p * inv_noise_scale;\n" +
        "        let n = noise3d(s, uPerlinNoisePermutationSeed);\n" +
        "        \n" +
        "        match_boundary(inv_noise_scale, distance, normal, &psi);\n" +
        "        psi = psi + height_factor * noise_gain * n;\n" +
        "\n" +
        "        noise_gain = noise_gain * 0.5;\n" +
        "    }\n" +
        "    \n" +
        "    // [ add custom potentials ]\n" +
        "    // --------\n" +
        "    // vec3 rising_force = vec3(-p.z, 0.0f, p.x);\n" +
        "    // \n" +
        "    // let ring_y = PlumeCeiling;\n" +
        "    // let d = ramp(abs(distance) / RingRadius);\n" +
        "    // \n" +
        "    // while (ring_y > PlumeBase) {\n" +
        "    // float ry = p.y - ring_y;\n" +
        "    // float rr = sqrt(dot(p.xz, p.xz));\n" +
        "    // vec3 v = vec3(rr-RingRadius, rr+RingRadius, ry);\n" +
        "    // float rmag = RingMagnitude / (dot(v,v) + RingFalloff);\n" +
        "    // vec3 rpsi = rmag * rising_force;\n" +
        "    // psi += mix(dot(rpsi, normal)*normal, psi, d);\n" +
        "    // ring_y -= RingSpeed / RingsPerSecond;\n" +
        "    // }\n" +
        "    \n" +
        "    return psi;\n" +
        "}\n" +
        "\n" +
        "\n" +
        "fn compute_curl(p: vec3<f32>, uPerlinNoisePermutationSeed: f32) -> vec3<f32> {\n" +
        "    let eps:f32 = 1.0e-4;\n" +
        "    \n" +
        "    let dx = vec3<f32>(eps, 0.0, 0.0);\n" +
        "    let dy = dx.yxy;\n" +
        "    let dz = dx.yyx;\n" +
        "    \n" +
        "    let p00 = sample_potential(p + dx, uPerlinNoisePermutationSeed);\n" +
        "    let p01 = sample_potential(p - dx, uPerlinNoisePermutationSeed);\n" +
        "    let p10 = sample_potential(p + dy, uPerlinNoisePermutationSeed);\n" +
        "    let p11 = sample_potential(p - dy, uPerlinNoisePermutationSeed);\n" +
        "    let p20 = sample_potential(p + dz, uPerlinNoisePermutationSeed);\n" +
        "    let p21 = sample_potential(p - dz, uPerlinNoisePermutationSeed);\n" +
        "    \n" +
        "    var v = vec3<f32>(0.0);\n" +
        "    v.x = p11.z - p10.z - p21.y + p20.y;\n" +
        "    v.y = p21.x - p20.x - p01.z + p00.z;\n" +
        "    v.z = p01.y - p00.y - p11.x + p10.x;\n" +
        "    v = v / (2.0*eps);\n" +
        "    \n" +
        "    return v;\n" +
        "}\n"
    );
  }
}
