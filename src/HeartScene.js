import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildHeart, seamPoints } from "./heartGeometry.js";

// idle: floats and breathes -> beat: heartbeat that grows with every tap -> open: splits in two
export function createHeartScene(container, { onStart, onProgress, onOpening, onOpened }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  // Soft studio reflections give the lacquered, luxurious look
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xfff0e0, 1.6);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(0xffc98a, 1.2);
  rim.position.set(-4, 2, -3);
  const inner = new THREE.PointLight(0xffb27a, 0, 6);
  inner.position.set(0, 0, 0.3);
  scene.add(key, rim, inner);

  // Heart: two halves that share one lacquered blood-red skin
  const skin = new THREE.MeshPhysicalMaterial({
    color: 0x7a0612, roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15,
    envMapIntensity: 0.8, emissive: 0x8a0010, emissiveIntensity: 0, transparent: true,
  });
  const core = new THREE.MeshStandardMaterial({
    color: 0x3a0309, emissive: 0xff5a3c, emissiveIntensity: 0, side: THREE.DoubleSide, transparent: true,
  });
  const g = buildHeart();
  const heart = new THREE.Group();
  const R = new THREE.Group();
  const L = new THREE.Group();
  R.add(new THREE.Mesh(g.right, skin), new THREE.Mesh(g.capRight, core));
  L.add(new THREE.Mesh(g.left, skin), new THREE.Mesh(g.capLeft, core));
  heart.add(R, L);
  scene.add(heart);

  // Golden seam that lights up down the middle as the heart gets ready to split
  const seam = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seamPoints().map((p) => new THREE.Vector3(...p))), 120, 0.014, 6),
    new THREE.MeshBasicMaterial({
      color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false,
    })
  );
  seam.position.z = 0.012;
  heart.add(seam);

  // Soft glow behind the heart + floating gold dust
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.3, "rgba(255,255,255,.35)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = gr;
  x.fillRect(0, 0, 128, 128);
  const dot = new THREE.CanvasTexture(c);
  dot.colorSpace = THREE.SRGBColorSpace;

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: dot, color: 0xff1e30, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  halo.scale.setScalar(8);
  halo.position.z = -1.5;
  scene.add(halo);

  const D = 140;
  const dp = new Float32Array(D * 3), bv = new Float32Array(D * 3), drift = new Float32Array(D);
  for (let i = 0; i < D; i++) {
    dp.set([(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3], i * 3);
    drift[i] = 0.04 + Math.random() * 0.1;
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(
    dg,
    new THREE.PointsMaterial({
      map: dot, color: 0xe8c98f, size: 0.09, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  dust.frustumCulled = false;
  scene.add(dust);

  const burst = () => {
    for (let i = 0; i < D; i++) {
      const a = Math.random() * Math.PI * 2, s = 1 + Math.random() * 4;
      dp.set([(Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4], i * 3);
      bv.set([Math.cos(a) * s, Math.sin(a) * s, (Math.random() - 0.3) * s], i * 3);
    }
  };

  // lub-dub: two quick bumps per beat
  const beat = (p) => Math.exp(-(((p - 0.08) / 0.05) ** 2)) + 0.65 * Math.exp(-(((p - 0.3) / 0.07) ** 2));

  let state = "idle", charge = 0, t = 0, ph = 0, openT = 0, done = false, raf;
  const clock = new THREE.Clock();
  const red = new THREE.Color(0xff1e30), gold = new THREE.Color(0xffd9a0);

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const float = Math.sin(t * 1.2) * 0.1;

    if (state === "idle") {
      heart.position.set(0, float, 0);
      heart.rotation.y = Math.sin(t * 0.5) * 0.4;
      heart.scale.setScalar(1 + Math.sin(t * 1.8) * 0.015);
      halo.material.opacity = 0.18 + Math.sin(t * 1.8) * 0.03;
    } else if (state === "beat") {
      charge = Math.min(1, charge + dt * 0.07); // it also opens by itself if you stop tapping
      onProgress(charge);
      ph += (dt * (65 + charge * 85)) / 60; // heartbeat speeds up
      const b = beat(ph % 1);
      const j = () => (Math.random() - 0.5) * 0.03 * charge * charge; // slight tremble near the end
      heart.position.set(j(), float * (1 - charge) + j(), 0);
      heart.rotation.y = Math.sin(t * 0.5) * 0.4 * (1 - charge);
      heart.scale.setScalar(1 + (0.05 + charge * 0.08) * b);
      skin.emissiveIntensity = b * charge * 0.5;
      seam.material.opacity = Math.min(1, charge * 1.4);
      halo.material.opacity = 0.2 + charge * 0.3 + b * charge * 0.25;
      if (charge >= 1) {
        state = "open";
        burst();
        onOpening();
      }
    } else {
      openT += dt;
      const e = 1 - (1 - Math.min(openT / 1.8, 1)) ** 3;
      const fade = 1 - Math.min(1, Math.max(0, (openT - 1.1) / 1.3));
      heart.position.set(0, 0, 0);
      heart.rotation.y = 0;
      heart.scale.setScalar(1 + 0.06 * (1 - e));
      R.rotation.set(0, e * 1.0, -e * 0.18);
      L.rotation.set(0, -e * 1.0, e * 0.18);
      R.position.x = e * 0.5;
      L.position.x = -e * 0.5;
      skin.opacity = core.opacity = fade;
      skin.emissiveIntensity = 0;
      core.emissiveIntensity = Math.min(1.2, openT * 2);
      inner.intensity = 40 * Math.min(1, openT * 1.5) * (0.3 + 0.7 * fade);
      seam.material.opacity = 0;
      halo.material.color.lerp(gold, 0.06);
      halo.material.opacity = Math.max(0.45, 1 - openT * 0.35);
      halo.scale.setScalar(8 + e * 3);
      if (openT > 1.9 && !done) {
        done = true;
        onOpened();
      }
    }

    for (let i = 0; i < D; i++) {
      for (let k = 0; k < 3; k++) {
        const n = i * 3 + k;
        dp[n] += (bv[n] + (k === 1 ? drift[i] : 0)) * dt;
        bv[n] *= 1 - 1.8 * dt;
      }
      if (dp[i * 3 + 1] > 3.4) dp[i * 3 + 1] = -3.4;
    }
    dg.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  };

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight, aspect = w / h;
    renderer.setSize(w, h);
    camera.aspect = aspect;
    camera.position.set(0, 0, Math.max(7, 4.8 / (aspect * 0.728))); // keeps the heart in frame on phones
    camera.updateProjectionMatrix();
  };

  const tap = () => {
    if (state === "open") return;
    if (state === "idle") {
      state = "beat";
      onStart();
    }
    ph = 0; // every tap triggers a heartbeat right away
    charge = Math.min(1, charge + 0.13);
    navigator.vibrate?.(30);
  };
  const key_ = (e) => (e.code === "Space" || e.code === "Enter") && tap();

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", key_);
  renderer.domElement.addEventListener("pointerdown", tap);
  loop();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", key_);
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
