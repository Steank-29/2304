import * as THREE from "three";

// A plump, perfectly symmetric 3D heart built from the classic heart curve.
// Returned as two halves (right / left) plus their flat cut faces, so it can split open.
const SC = 0.1; // world scale
const H = 8; // half thickness (curve units)
const SY = 2.5; // centers the heart vertically
const curve = (t) => [
  16 * Math.sin(t) ** 3,
  13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
];

export function buildHeart() {
  const A = 72, B = 48, cols = 2 * A, rows = B + 1;
  const pos = new Float32Array(cols * rows * 3);
  for (let i = 0; i < cols; i++) {
    const [px, py] = curve((i / cols) * Math.PI * 2);
    for (let j = 0; j < rows; j++) {
      const phi = (j / B) * Math.PI, s = Math.sin(phi);
      pos.set([s * px * SC, (s * py + SY) * SC, H * Math.cos(phi) * SC], (i * rows + j) * 3);
    }
  }
  const idx = [[], []]; // 0 = right half (x > 0), 1 = left half
  for (let i = 0; i < cols; i++) {
    const i2 = (i + 1) % cols;
    for (let j = 0; j < B; j++) {
      const a = i * rows + j, b = i2 * rows + j;
      idx[i < A ? 0 : 1].push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const whole = new THREE.BufferGeometry();
  whole.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  whole.setIndex([...idx[0], ...idx[1]]);
  whole.computeVertexNormals(); // computed on the whole heart so the seam shades smoothly
  const nrm = whole.attributes.normal;
  for (let i = 0; i < cols; i++) {
    nrm.setXYZ(i * rows, 0, 0, 1);
    nrm.setXYZ(i * rows + B, 0, 0, -1);
  }
  const shell = (ix) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", whole.attributes.position);
    g.setAttribute("normal", nrm);
    g.setIndex(ix);
    return g;
  };

  // Flat cut face (the heart's cross-section on the x = 0 plane)
  const ring = [];
  for (let j = 0; j <= B; j++) {
    const p = (j / B) * Math.PI;
    ring.push([(5 * Math.sin(p) + SY) * SC, H * Math.cos(p) * SC]);
  }
  for (let j = B; j >= 0; j--) {
    const p = (j / B) * Math.PI;
    ring.push([(-17 * Math.sin(p) + SY) * SC, H * Math.cos(p) * SC]);
  }
  const cap = (dir) => {
    const v = [0, (-6 + SY) * SC, 0], ix = [], n = ring.length;
    ring.forEach(([y, z]) => v.push(0, y, z));
    for (let k = 1; k <= n; k++) {
      const b = (k % n) + 1;
      ix.push(0, ...(dir < 0 ? [k, b] : [b, k]));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(Array.from({ length: n + 1 }, () => [dir, 0, 0]).flat(), 3));
    g.setIndex(ix);
    return g;
  };

  return { right: shell(idx[0]), left: shell(idx[1]), capRight: cap(-1), capLeft: cap(1) };
}

// Path of the seam down the front of the heart (notch -> center -> tip)
export function seamPoints() {
  const pts = [];
  for (let k = 0; k <= 10; k++) {
    const p = (Math.PI / 2) * (1 - k / 10);
    pts.push([0, (5 * Math.sin(p) + SY) * SC, H * Math.cos(p) * SC]);
  }
  for (let k = 1; k <= 16; k++) {
    const p = (Math.PI / 2) * (k / 16);
    pts.push([0, (-17 * Math.sin(p) + SY) * SC, H * Math.cos(p) * SC]);
  }
  return pts;
}
