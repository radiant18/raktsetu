"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Inside a blood vessel: realistic biconcave red blood cells (Evans–Fung shape) tumbling past.
// Mouse moves the camera, drag rotates the flow.
function rbcGeometry() {
  const R = 1, C0 = 0.0518, C2 = 2.0026, C4 = -4.491, D = 0.5; // Evans–Fung coefficients
  const h = (p: number) => D * Math.sqrt(Math.max(0, 1 - p * p)) * (C0 + C2 * p * p + C4 * p ** 4);
  const pts: THREE.Vector2[] = [];
  const N = 70;
  // top surface centre -> rim (dense near the rim), then bottom rim -> centre
  for (let i = 0; i <= N; i++) { const p = Math.sin((i / N) * Math.PI / 2); pts.push(new THREE.Vector2(Math.max(p * R, 1e-4), h(p))); }
  for (let i = N - 1; i >= 0; i--) { const p = Math.sin((i / N) * Math.PI / 2); pts.push(new THREE.Vector2(Math.max(p * R, 1e-4), -h(p))); }
  const g = new THREE.LatheGeometry(pts, 96);
  g.computeVertexNormals();
  return g;
}

export default function Drop3D() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const w = () => el.clientWidth, hgt = () => el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), hgt());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a0205, 0.085);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;

    const camera = new THREE.PerspectiveCamera(38, w() / hgt(), 0.1, 100);
    camera.position.set(0, 0, 12);

    const geo = rbcGeometry();
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xb3121f,
      roughness: 0.38,
      metalness: 0,
      clearcoat: 0.55,
      clearcoatRoughness: 0.35,
      sheen: 1,
      sheenColor: new THREE.Color(0xff5a66),
      sheenRoughness: 0.45,
      transmission: 0.12,
      thickness: 0.6,
      attenuationColor: new THREE.Color(0x5a0008),
      attenuationDistance: 0.8,
      ior: 1.4,
      emissive: new THREE.Color(0x2a0003),
      envMapIntensity: 0.9,
    });

    const COUNT = 60;
    const cells = new THREE.InstancedMesh(geo, mat, COUNT);
    cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const flow = new THREE.Group();
    flow.add(cells);
    scene.add(flow);

    const SPAN = 16;
    const data = Array.from({ length: COUNT }, () => ({
      x: (Math.random() - 0.5) * SPAN,
      y: (Math.random() - 0.5) * 6.5,
      z: -Math.random() * 12 + 2.5,
      s: 0.42 + Math.random() * 0.36,
      speed: 0.6 + Math.random() * 0.9,
      rx: Math.random() * Math.PI, ry: Math.random() * Math.PI, rz: Math.random() * Math.PI,
      vx: (Math.random() - 0.5) * 0.9, vy: (Math.random() - 0.5) * 0.9, vz: (Math.random() - 0.5) * 0.6,
      wob: Math.random() * Math.PI * 2,
    }));
    // a few hero cells close to the camera, nicely angled
    [[-1.8, 0.7, 2.2, 0.95], [2.0, -1.0, 1.4, 0.85], [0.2, 2.1, 0.4, 0.7]].forEach(([x, y, z, s], i) => Object.assign(data[i], { x, y, z, s, speed: 0.35 }));

    scene.add(new THREE.AmbientLight(0xffd6d6, 0.35));
    const key = new THREE.DirectionalLight(0xfff1ea, 3.2); key.position.set(4, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff3344, 2.6); rim.position.set(-6, -2, -4); scene.add(rim);
    const glow = new THREE.PointLight(0xff2a3a, 30, 14, 2); glow.position.set(0, 0, 3); scene.add(glow);

    let mx = 0, my = 0, dragging = false, lastX = 0, lastY = 0, rotY = 0, rotX = 0, vY = 0, vX = 0;
    const onMove = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      mx = ((e.clientX - b.left) / b.width - 0.5) * 2;
      my = ((e.clientY - b.top) / b.height - 0.5) * 2;
      if (dragging) { vY = (e.clientX - lastX) * 0.004; vX = (e.clientY - lastY) * 0.004; lastX = e.clientX; lastY = e.clientY; }
    };
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; el.style.cursor = "grabbing"; };
    const onUp = () => { dragging = false; el.style.cursor = "grab"; };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.style.cursor = "grab";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const pulse = 1 + Math.max(0, Math.sin(t * 5)) ** 10 * 0.6; // heartbeat surge in the flow
      for (let i = 0; i < COUNT; i++) {
        const d = data[i];
        if (!reduce) {
          d.x += d.speed * pulse * dt;
          d.rx += d.vx * dt; d.ry += d.vy * dt; d.rz += d.vz * dt;
          if (d.x > SPAN / 2 + 2) d.x = -SPAN / 2 - 2;
        }
        pos.set(d.x, d.y + Math.sin(t * 0.8 + d.wob) * 0.25, d.z);
        e3.set(d.rx, d.ry, d.rz); q.setFromEuler(e3);
        // squash slightly as cells flex in the flow
        const flex = 1 + Math.sin(t * 2 + d.wob) * 0.04;
        scl.set(d.s * flex, d.s / flex, d.s * flex);
        m4.compose(pos, q, scl);
        cells.setMatrixAt(i, m4);
      }
      cells.instanceMatrix.needsUpdate = true;
      if (!dragging) { vY *= 0.94; vX *= 0.94; }
      rotY += vY; rotX = Math.max(-0.6, Math.min(0.6, rotX + vX));
      flow.rotation.y = rotY * 0.6;
      flow.rotation.x = rotX * 0.6;
      camera.position.x += (mx * 1.2 - camera.position.x) * 0.05;
      camera.position.y += (-my * 0.8 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      glow.intensity = 26 + (pulse - 1) * 40;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const ro = new ResizeObserver(() => { renderer.setSize(w(), hgt()); camera.aspect = w() / hgt(); camera.updateProjectionMatrix(); });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); el.removeEventListener("pointerdown", onDown);
      geo.dispose(); mat.dispose(); env.dispose(); pmrem.dispose(); renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={host} className="absolute inset-0" aria-label="3D red blood cells flowing, drag to rotate" />;
}
