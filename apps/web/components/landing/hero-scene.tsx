"use client";

import { useEffect, useRef } from "react";

type Three = typeof import("three");
type RoundedBox = typeof import("three/examples/jsm/geometries/RoundedBoxGeometry.js").RoundedBoxGeometry;
type Room = typeof import("three/examples/jsm/environments/RoomEnvironment.js").RoomEnvironment;

const NAVY = 0x202a36;

/**
 * The landing hero's 3D scene: a dark Anuma card (the credit line) behind drifting frosted-glass
 * pane (the privacy), orbited by pearl spheres (the verified people it hides among). three.js loads
 * after first paint; without WebGL the CSS gradient behind the canvas stays. Kept cheap on purpose:
 * the frosted pane is a translucent grain texture instead of real transmission (which re-renders the
 * scene every frame), standard-material spheres, pixel ratio capped at 1.25, at most ~60 frames a second.
 */
export function HeroScene({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stop = () => undefined;
    let cancelled = false;
    Promise.all([
      import("three"),
      import("three/examples/jsm/geometries/RoundedBoxGeometry.js"),
      import("three/examples/jsm/environments/RoomEnvironment.js"),
    ]).then(([THREE, rounded, room]) => {
      if (cancelled) return;
      try {
        stop = mount(el, THREE, rounded.RoundedBoxGeometry, room.RoomEnvironment);
      } catch {
        return;
      }
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return <div ref={host} aria-hidden className={className} />;
}

function cardFace(THREE: Three): InstanceType<Three["CanvasTexture"]> {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 646;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "rgba(255,255,255,0.92)";
  g.font = "600 64px Inter, system-ui, sans-serif";
  g.fillText("Anuma", 72, 120);
  g.fillStyle = "rgba(255,255,255,0.55)";
  g.font = "500 26px Inter, system-ui, sans-serif";
  g.textAlign = "right";
  g.fillText("PRIVATE CREDIT", 952, 112);
  g.textAlign = "left";
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.font = "500 44px ui-monospace, Menlo, monospace";
  g.fillText("••••  ••••  ••••  uHg4", 72, 470);
  g.fillStyle = "rgba(255,255,255,0.5)";
  g.font = "500 24px Inter, system-ui, sans-serif";
  g.fillText("HOLDER", 72, 552);
  g.fillText("LIMIT", 640, 552);
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.font = "500 32px Inter, system-ui, sans-serif";
  g.fillText("Verified, unnamed", 72, 596);
  g.fillText("37.50 mUSDC", 640, 596);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function frost(THREE: Three): InstanceType<Three["CanvasTexture"]> {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  const image = g.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 228 + Math.random() * 27;
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v + 2;
    image.data[i + 3] = 255;
  }
  g.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 4);
  return texture;
}

function backdrop(THREE: Three): InstanceType<Three["CanvasTexture"]> {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 512;
  const g = canvas.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#f9fafb");
  grad.addColorStop(0.55, "#eef0f3");
  grad.addColorStop(1, "#dde1e7");
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function mount(el: HTMLDivElement, THREE: Three, RoundedBoxGeometry: RoundedBox, RoomEnvironment: Room): () => undefined {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const compact = el.clientWidth < 700;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, el.clientWidth > 1500 ? 1 : 1.25));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const sky = backdrop(THREE);
  scene.background = sky;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.85;

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-4, 6, 6);
  const rim = new THREE.DirectionalLight(0xdfe7f2, 1.4);
  rim.position.set(6, 2, -5);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.35));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const stage = new THREE.Group();
  scene.add(stage);

  const disposables: { dispose(): void }[] = [sky, pmrem, renderer];

  const cardGroup = new THREE.Group();
  cardGroup.scale.setScalar(1.05);
  stage.add(cardGroup);
  const cardGeo = new RoundedBoxGeometry(3.37, 2.125, 0.07, 6, 0.13);
  const cardMat = new THREE.MeshPhysicalMaterial({ color: NAVY, metalness: 0.45, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.16 });
  cardGroup.add(new THREE.Mesh(cardGeo, cardMat));
  const face = cardFace(THREE);
  const faceGeo = new THREE.PlaneGeometry(3.3, 2.08);
  const faceMat = new THREE.MeshBasicMaterial({ map: face, transparent: true, toneMapped: false });
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.z = 0.037;
  cardGroup.add(faceMesh);
  const chipGeo = new RoundedBoxGeometry(0.46, 0.35, 0.03, 4, 0.05);
  const chipMat = new THREE.MeshStandardMaterial({ color: 0xd9d3c4, metalness: 1, roughness: 0.26 });
  const chip = new THREE.Mesh(chipGeo, chipMat);
  chip.position.set(-1.12, 0.12, 0.04);
  cardGroup.add(chip);
  disposables.push(cardGeo, cardMat, face, faceGeo, faceMat, chipGeo, chipMat);

  const glassGeo = new RoundedBoxGeometry(1.7, 2.6, 0.14, 6, 0.12);
  const grain = frost(THREE);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: grain,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.7,
    clearcoatRoughness: 0.28,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const panes = [
    { mesh: new THREE.Mesh(glassGeo, glassMat), x: 1.0, y: 0.02, z: 0.8, ry: -0.34, speed: 0.15, scale: 0.95 },
  ];
  for (const pane of panes) {
    pane.mesh.scale.setScalar(pane.scale);
    stage.add(pane.mesh);
  }
  disposables.push(glassGeo, glassMat, grain);

  const count = compact ? 90 : 160;
  const dotGeo = new THREE.SphereGeometry(1, 12, 8);
  const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28, metalness: 0 });
  const dots = new THREE.InstancedMesh(dotGeo, dotMat, count);
  const pearl = new THREE.Color(0xf4f5f7);
  const mist = new THREE.Color(0xd5dae1);
  const navy = new THREE.Color(NAVY);
  const people = Array.from({ length: count }, (_, i) => {
    const radius = 2.8 + Math.pow(Math.random(), 0.8) * 4.4;
    const color = i % 14 === 0 ? navy : Math.random() < 0.35 ? mist : pearl;
    dots.setColorAt(i, color);
    return {
      radius,
      angle: Math.random() * Math.PI * 2,
      height: (Math.random() - 0.5) * (0.5 + radius * 0.1),
      size: 0.03 + Math.random() * 0.055,
      speed: 0.04 + 0.22 / radius,
      bob: Math.random() * Math.PI * 2,
    };
  });
  stage.add(dots);
  disposables.push(dotGeo, dotMat);


  const dummy = new THREE.Object3D();
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let easedScroll = 0;

  const layout = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const portrait = camera.aspect < 1;
    stage.scale.setScalar(portrait ? Math.max(0.55, camera.aspect * 1.4) : 1);
    stage.position.y = portrait ? -2.95 : -2.45;
  };

  const draw = (t: number) => {
    const scroll = Math.min(1, window.scrollY / Math.max(1, el.clientHeight));
    easedScroll += (scroll - easedScroll) * (reduce ? 1 : 0.08);
    easedX += (pointerX - easedX) * 0.05;
    easedY += (pointerY - easedY) * 0.05;

    camera.position.set(easedX * 0.7, 0.45 - easedScroll * 1.1 - easedY * 0.25, 13.5 - easedScroll * 3.4);
    camera.lookAt(0, -1.05 - easedScroll * 0.6, 0);

    cardGroup.position.y = Math.sin(t * 0.8) * 0.06;
    cardGroup.rotation.set(-0.12 + Math.cos(t * 0.3) * 0.04 - easedScroll * 0.35, -0.4 + Math.sin(t * 0.25) * 0.12 + easedX * 0.25, 0.04);

    for (const pane of panes) {
      pane.mesh.position.set(pane.x + Math.sin(t * pane.speed) * 0.38, pane.y + Math.sin(t * pane.speed * 1.7) * 0.05, pane.z);
      pane.mesh.rotation.set(0.02, pane.ry + Math.sin(t * pane.speed) * 0.08, 0.03);
    }

    people.forEach((p, i) => {
      const a = p.angle + t * p.speed;
      const x = Math.cos(a) * p.radius;
      const z = Math.sin(a) * p.radius * 0.55 - 1.5;
      const y = p.height + Math.sin(t * 0.6 + p.bob) * 0.05;
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(z > -0.3 && Math.abs(x) < 2.3 && Math.abs(y) < 1.4 ? 0 : p.size);
      dummy.updateMatrix();
      dots.setMatrixAt(i, dummy.matrix);
    });
    dots.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
  };

  layout();

  let raf = 0;
  let running = false;
  let visible = true;
  let last = performance.now();
  let t = reduce ? 2 : 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (now - last < 15) return;
    t += Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(t);
  };
  const sync = () => {
    const want = !reduce && visible && !document.hidden;
    if (want && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!want && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };

  const onPointer = (e: PointerEvent) => {
    pointerX = e.clientX / window.innerWidth - 0.5;
    pointerY = e.clientY / window.innerHeight - 0.5;
  };
  const onScroll = () => {
    if (reduce) draw(t);
  };
  const resize = new ResizeObserver(() => {
    layout();
    draw(t);
  });
  const seen = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });

  resize.observe(el);
  seen.observe(el);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  draw(t);
  sync();

  return () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    seen.disconnect();
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    scene.environment?.dispose();
    room.dispose();
    for (const d of disposables) d.dispose();
    renderer.domElement.remove();
    return undefined;
  };
}
