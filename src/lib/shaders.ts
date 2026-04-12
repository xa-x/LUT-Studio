/** Fullscreen triangle blit: sample filtered texture to swapchain (no CPU readback). */
export const LUT_BLIT_SHADER = /* wgsl */`
@group(0) @binding(0) var previewTex: texture_2d<f32>;
@group(0) @binding(1) var previewSamp: sampler;

struct VSOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  let p = pos[vi];
  var o: VSOut;
  o.position = vec4f(p, 0.0, 1.0);
  let uv = p * 0.5 + vec2f(0.5);
  o.uv = vec2f(uv.x, 1.0 - uv.y);
  return o;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4f {
  return textureSample(previewTex, previewSamp, in.uv);
}
`;

// WGSL shader for applying LUT to an image
export const LUT_APPLY_SHADER = /* wgsl */`
struct Params {
  width: u32,
  height: u32,
  lutSize: u32,
  padding: u32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var inputTex: texture_2d<f32>;
@group(0) @binding(2) var outputTex: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var lutTex: texture_3d<f32>;
@group(0) @binding(4) var samp: sampler;

// Trilinear sampling of the 3D LUT texture using textureLoad
fn sampleLUT(color: vec3f) -> vec3f {
  let lutSize = f32(params.lutSize);
  let lutSizeI = i32(params.lutSize);
  let lutMax = lutSize - 1.0;

  // Map color to LUT coordinates (with half-pixel offset for texel centers)
  let coord = clamp(color, vec3f(0.0), vec3f(1.0)) * lutMax;
  let p0 = vec3i(i32(floor(coord.x)), i32(floor(coord.y)), i32(floor(coord.z)));
  let frac = coord - floor(coord);

  // Clamp to valid range
  var c0 = clamp(p0, vec3i(0), vec3i(lutSizeI - 1));
  var c1 = clamp(p0 + vec3i(1), vec3i(0), vec3i(lutSizeI - 1));

  // Load 8 corners
  let v000 = textureLoad(lutTex, vec3i(c0.x, c0.y, c0.z), 0).rgb;
  let v100 = textureLoad(lutTex, vec3i(c1.x, c0.y, c0.z), 0).rgb;
  let v010 = textureLoad(lutTex, vec3i(c0.x, c1.y, c0.z), 0).rgb;
  let v110 = textureLoad(lutTex, vec3i(c1.x, c1.y, c0.z), 0).rgb;
  let v001 = textureLoad(lutTex, vec3i(c0.x, c0.y, c1.z), 0).rgb;
  let v101 = textureLoad(lutTex, vec3i(c1.x, c0.y, c1.z), 0).rgb;
  let v011 = textureLoad(lutTex, vec3i(c0.x, c1.y, c1.z), 0).rgb;
  let v111 = textureLoad(lutTex, vec3i(c1.x, c1.y, c1.z), 0).rgb;

  // Trilinear interpolation
  let fx = frac.x;
  let fy = frac.y;
  let fz = frac.z;

  let c00 = mix(v000, v100, fx);
  let c10 = mix(v010, v110, fx);
  let c01 = mix(v001, v101, fx);
  let c11 = mix(v011, v111, fx);

  let c0r = mix(c00, c10, fy);
  let c1r = mix(c01, c11, fy);

  return mix(c0r, c1r, fz);
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let x = gid.x;
  let y = gid.y;
  if (x >= params.width || y >= params.height) {
    return;
  }

  let texCoord = vec2f(f32(x) + 0.5, f32(y) + 0.5);
  let uv = texCoord / vec2f(f32(params.width), f32(params.height));
  var color = textureSampleLevel(inputTex, samp, uv, 0.0);

  // Sample the LUT using manual trilinear interpolation
  let lutColor = sampleLUT(color.rgb);
  textureStore(outputTex, vec2i(i32(x), i32(y)), vec4f(lutColor, color.a));
}
`;

// WGSL shader for generating the LUT 3D texture from filter parameters
export const LUT_GENERATE_SHADER = /* wgsl */`
struct Params {
  lutSize: f32,
  brightness: f32,
  contrast: f32,
  saturation: f32,
  hue: f32,
  temperature: f32,
  tint: f32,
  exposure: f32,
  gamma: f32,
  highlights: f32,
  shadows: f32,
  vibrance: f32,
  // Per-channel lift/gamma/gain
  redLift: f32,
  redGamma: f32,
  redGain: f32,
  greenLift: f32,
  greenGamma: f32,
  greenGain: f32,
  blueLift: f32,
  blueGamma: f32,
  blueGain: f32,
  // Curve control points (5 per curve, packed as x,y pairs)
  masterCurveX0: f32, masterCurveY0: f32,
  masterCurveX1: f32, masterCurveY1: f32,
  masterCurveX2: f32, masterCurveY2: f32,
  masterCurveX3: f32, masterCurveY3: f32,
  masterCurveX4: f32, masterCurveY4: f32,
  redCurveX0: f32, redCurveY0: f32,
  redCurveX1: f32, redCurveY1: f32,
  redCurveX2: f32, redCurveY2: f32,
  redCurveX3: f32, redCurveY3: f32,
  redCurveX4: f32, redCurveY4: f32,
  greenCurveX0: f32, greenCurveY0: f32,
  greenCurveX1: f32, greenCurveY1: f32,
  greenCurveX2: f32, greenCurveY2: f32,
  greenCurveX3: f32, greenCurveY3: f32,
  greenCurveX4: f32, greenCurveY4: f32,
  blueCurveX0: f32, blueCurveY0: f32,
  blueCurveX1: f32, blueCurveY1: f32,
  blueCurveX2: f32, blueCurveY2: f32,
  blueCurveX3: f32, blueCurveY3: f32,
  blueCurveX4: f32, blueCurveY4: f32,
}

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var lutTex: texture_storage_3d<rgba16float, write>;

// Catmull-Rom spline interpolation for curves
fn catmullRom(p0: f32, p1: f32, p2: f32, p3: f32, t: f32) -> f32 {
  let t2 = t * t;
  let t3 = t2 * t;
  return 0.5 * (
    (2.0 * p1) +
    (-p0 + p2) * t +
    (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
    (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
  );
}

fn sampleCurve(
  x: f32,
  cx0: f32, cy0: f32,
  cx1: f32, cy1: f32,
  cx2: f32, cy2: f32,
  cx3: f32, cy3: f32,
  cx4: f32, cy4: f32,
) -> f32 {
  let xs = array<f32, 5>(cx0, cx1, cx2, cx3, cx4);
  let ys = array<f32, 5>(cy0, cy1, cy2, cy3, cy4);

  if (x <= xs[0]) { return ys[0]; }
  if (x >= xs[4]) { return ys[4]; }

  var seg = 0u;
  for (var i = 0u; i < 4u; i++) {
    if (x >= xs[i] && x <= xs[i + 1u]) {
      seg = i;
      break;
    }
  }

  let segLen = xs[seg + 1u] - xs[seg];
  let t = select(0.0, (x - xs[seg]) / segLen, segLen > 0.0);

  let p0 = ys[select(0u, seg - 1u, seg > 0u)];
  let p1 = ys[seg];
  let p2 = ys[seg + 1u];
  let p3 = ys[select(seg + 2u, 4u, seg + 2u <= 4u)];

  return catmullRom(p0, p1, p2, p3, t);
}

fn rgbToHsl(r: f32, g: f32, b: f32) -> vec3f {
  let maxC = max(r, max(g, b));
  let minC = min(r, min(g, b));
  let l = (maxC + minC) * 0.5;
  var h = 0.0;
  var s = 0.0;
  if (maxC != minC) {
    let d = maxC - minC;
    s = select(d / (2.0 - maxC - minC), d / (maxC + minC), l < 0.5);
    if (maxC == r) {
      h = (g - b) / d + select(6.0, 0.0, g >= b);
    } else if (maxC == g) {
      h = (b - r) / d + 2.0;
    } else {
      h = (r - g) / d + 4.0;
    }
    h = h / 6.0;
  }
  return vec3f(h, s, l);
}

// Hoisted as top-level function (WGSL does not support nested functions)
fn hue2rgb(p: f32, q: f32, t: f32) -> f32 {
  var tt = t;
  if (tt < 0.0) { tt += 1.0; }
  if (tt > 1.0) { tt -= 1.0; }
  if (tt < 1.0/6.0) { return p + (q - p) * 6.0 * tt; }
  if (tt < 1.0/2.0) { return q; }
  if (tt < 2.0/3.0) { return p + (q - p) * (2.0/3.0 - tt) * 6.0; }
  return p;
}

fn hslToRgb(h: f32, s: f32, l: f32) -> vec3f {
  if (s == 0.0) {
    return vec3f(l);
  }
  let q2 = select(l * (1.0 + s), l + s - l * s, l < 0.5);
  let p2 = 2.0 * l - q2;
  return vec3f(
    hue2rgb(p2, q2, h + 1.0/3.0),
    hue2rgb(p2, q2, h),
    hue2rgb(p2, q2, h - 1.0/3.0),
  );
}

@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let size = u32(params.lutSize);
  if (gid.x >= size || gid.y >= size || gid.z >= size) {
    return;
  }

  // Input color from identity LUT
  var r = f32(gid.x) / f32(size - 1u);
  var g = f32(gid.y) / f32(size - 1u);
  var b = f32(gid.z) / f32(size - 1u);

  // 1. Exposure
  r *= pow(2.0, params.exposure);
  g *= pow(2.0, params.exposure);
  b *= pow(2.0, params.exposure);

  // 2. Brightness
  r += params.brightness;
  g += params.brightness;
  b += params.brightness;

  // 3. Contrast (around 0.5 midpoint)
  let contrast = params.contrast;
  r = (r - 0.5) * contrast + 0.5;
  g = (g - 0.5) * contrast + 0.5;
  b = (b - 0.5) * contrast + 0.5;

  // 4. Gamma
  r = pow(max(r, 0.0), 1.0 / max(params.gamma, 0.01));
  g = pow(max(g, 0.0), 1.0 / max(params.gamma, 0.01));
  b = pow(max(b, 0.0), 1.0 / max(params.gamma, 0.01));

  // 5. Highlights and Shadows
  let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let hiMask = smoothstep(0.3, 0.7, lum);
  let shMask = 1.0 - smoothstep(0.0, 0.5, lum);
  r += params.highlights * hiMask + params.shadows * shMask;
  g += params.highlights * hiMask + params.shadows * shMask;
  b += params.highlights * hiMask + params.shadows * shMask;

  // 6. Temperature (warm/cool shift)
  r += params.temperature * 0.1;
  b -= params.temperature * 0.1;

  // 7. Tint (green-magenta shift)
  g += params.tint * 0.05;

  // 8. Saturation & Vibrance
  let hsl = rgbToHsl(r, g, b);
  let satBoost = params.saturation + params.vibrance * (1.0 - hsl.y);
  let newS = clamp(hsl.y * satBoost, 0.0, 1.0);
  var rgb2 = hslToRgb(hsl.x, newS, hsl.z);
  r = rgb2.x;
  g = rgb2.y;
  b = rgb2.z;

  // 9. Hue rotation
  let hsl2 = rgbToHsl(r, g, b);
  var rgb3 = hslToRgb(fract(hsl2.x + params.hue), hsl2.y, hsl2.z);
  r = rgb3.x;
  g = rgb3.y;
  b = rgb3.z;

  // 10. Per-channel Lift/Gamma/Gain
  r = pow(max(r * params.redGain + params.redLift, 0.0), 1.0 / max(params.redGamma, 0.01));
  g = pow(max(g * params.greenGain + params.greenLift, 0.0), 1.0 / max(params.greenGamma, 0.01));
  b = pow(max(b * params.blueGain + params.blueLift, 0.0), 1.0 / max(params.blueGamma, 0.01));

  // 11. Master curve (sample at luminance so identity curve y=x leaves RGB unchanged)
  let lumW = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let m = sampleCurve(lumW,
    params.masterCurveX0, params.masterCurveY0,
    params.masterCurveX1, params.masterCurveY1,
    params.masterCurveX2, params.masterCurveY2,
    params.masterCurveX3, params.masterCurveY3,
    params.masterCurveX4, params.masterCurveY4,
  );
  let masterEffect = m - lumW;
  r += masterEffect;
  g += masterEffect;
  b += masterEffect;

  // 12. Per-channel curves
  r = sampleCurve(r,
    params.redCurveX0, params.redCurveY0,
    params.redCurveX1, params.redCurveY1,
    params.redCurveX2, params.redCurveY2,
    params.redCurveX3, params.redCurveY3,
    params.redCurveX4, params.redCurveY4,
  );
  g = sampleCurve(g,
    params.greenCurveX0, params.greenCurveY0,
    params.greenCurveX1, params.greenCurveY1,
    params.greenCurveX2, params.greenCurveY2,
    params.greenCurveX3, params.greenCurveY3,
    params.greenCurveX4, params.greenCurveY4,
  );
  b = sampleCurve(b,
    params.blueCurveX0, params.blueCurveY0,
    params.blueCurveX1, params.blueCurveY1,
    params.blueCurveX2, params.blueCurveY2,
    params.blueCurveX3, params.blueCurveY3,
    params.blueCurveX4, params.blueCurveY4,
  );

  // Clamp
  r = clamp(r, 0.0, 1.0);
  g = clamp(g, 0.0, 1.0);
  b = clamp(b, 0.0, 1.0);

  textureStore(lutTex, vec3i(i32(gid.x), i32(gid.y), i32(gid.z)), vec4f(r, g, b, 1.0));
}
`;
