"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// A glossy 3D blood drop with floating blood cells. Follows the mouse, drag to spin.
export default function Drop3D() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const w = () => el.clientWidth, h = () => el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), h());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w() / h(), 0.1, 100);
    camera.position.set(0, 0.2, 8);

    // Drop: lathe a teardrop profile
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 80; i++) {
      const th = (i / 80) * Math.PI; // 0 = tip (top), PI = round bottom
      const r = Math.sin(th) * Math.pow(Math.sin(th / 2), 1.6) * 1.35;
      pts.push(new THREE.Vector2(Math.max(r, 0.0001), Math.cos(th) * 1.65 + 0.15));
    }
    const drop = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 96),
      new THREE.MeshPhysicalMaterial({ color: 0xd10f28, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4, sheenColor: new THREE.Color(0xff6b7d) }),
    );
    const group = new THREE.Group();
    group.add(drop);
    scene.add(group);

    // Blood cells: torus-ish discs orbiting
    const cellGeo = new THREE.TorusGeometry(0.22, 0.11, 24, 48);
    const cellMat = new THREE.MeshPhysicalMaterial({ color: 0xe0112b, roughness: 0.3, clearcoat: 0.6 });
    const cells = Array.from({ length: 9 }, (_, i) => {
      const m = new THREE.Mesh(cellGeo, cellMat);
      const s = 0.5 + Math.random() * 0.7;
      m.scale.setScalar(s);
      m.userData = { r: 2.2 + Math.random() * 1.1, sp: 0.15 + Math.random() * 0.25, ph: (i / 9) * Math.PI * 2, y: (Math.random() - 0.5) * 2.6, rot: Math.random() * 0.02 + 0.005 };
      scene.add(m);
      return m;
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8899, 1.6); rim.position.set(-4, 1, -3); scene.add(rim);
    const fill = new THREE.PointLight(0xffffff, 8, 20); fill.position.set(-2, -2, 4); scene.add(fill);

    // Interaction
    let mx = 0, my = 0, spin = 0, vel = 0.004, dragging = false, lastX = 0;
    const onMove = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      mx = ((e.clientX - b.left) / b.width - 0.5) * 2;
      my = ((e.clientY - b.top) / b.height - 0.5) * 2;
      if (dragging) { vel = (e.clientX - lastX) * 0.0025; lastX = e.clientX; }
    };
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; el.style.cursor = "grabbing"; };
    const onUp = () => { dragging = false; el.style.cursor = "grab"; };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    el.style.cursor = "grab";

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      if (!dragging) vel += (0.004 - vel) * 0.02;
      spin += reduce ? 0 : vel;
      group.rotation.y = spin;
      group.rotation.x += (my * 0.25 - group.rotation.x) * 0.06;
      group.rotation.z += (-mx * 0.12 - group.rotation.z) * 0.06;
      // heartbeat pulse
      const beat = 1 + (Math.max(0, Math.sin(t * 5.2)) ** 12) * 0.05;
      drop.scale.setScalar(beat);
      group.position.y = Math.sin(t * 1.2) * 0.08;
      cells.forEach((c) => {
        const u = c.userData;
        const a = u.ph + t * u.sp;
        c.position.set(Math.cos(a) * u.r + mx * 0.3, u.y + Math.sin(t + u.ph) * 0.2, Math.sin(a) * u.r * 0.6);
        c.rotation.x += u.rot; c.rotation.y += u.rot * 1.3;
      });
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => { renderer.setSize(w(), h()); camera.aspect = w() / h(); camera.updateProjectionMatrix(); };
    const ro = new ResizeObserver(onResize); ro.observe(el);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); el.removeEventListener("pointerdown", onDown);
      renderer.dispose(); cellGeo.dispose(); cellMat.dispose(); drop.geometry.dispose(); (drop.material as THREE.Material).dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={host} className="absolute inset-0" aria-label="3D blood drop, drag to spin" />;
}
