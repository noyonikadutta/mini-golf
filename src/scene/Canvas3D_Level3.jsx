// src/scene/Canvas3D_Level3.jsx
import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ScoreBadge from "../ui/ScoreBadge";
import EndOfLevelModal from "../ui/EndofLevelModal";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const BALL_RADIUS = 0.3;
const HOLE_RADIUS = 0.5;
const COURSE_SIZE_X = 14;
const COURSE_SIZE_Z = 20;
const AIM_RADIUS = 1.2;

export default function Canvas3D_Level3() {
  const navigate = useNavigate();
  const mountRef = useRef();
  const ballRef = useRef();
  const holeRef = useRef();
  const flagRef = useRef();
  const confettiPoolRef = useRef([]);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const holeTriggeredRef = useRef(false);
  const sinkingRef = useRef({ active: false });
  // Aiming
  const isAimingRef = useRef(false);
  const dragStartRef = useRef(new THREE.Vector3());
  const previewPointRef = useRef(new THREE.Vector3());
  // Controls
  const controlsRef = useRef(null);
  const userInteractingRef = useRef(false);

  const [strokes, setStrokes] = useState(0);
  const [par] = useState(3);
  const [holeDone, setHoleDone] = useState(false);

  const onRetry = () => window.location.reload();
  const onNext = () => navigate("/menu"); // Level 3 is last -> go to menu
  const onMainMenu = () => navigate("/menu");

  const startPos = new THREE.Vector3(0, BALL_RADIUS, COURSE_SIZE_Z / 2 - 2);

  useEffect(() => {
    const mount = mountRef.current;

    // === Scene + Camera + Renderer ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb3d9ff);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
  // Eye-level and pulled back
  camera.position.set(0, 3, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controlsRef.current = controls;
    controls.target.set(0, BALL_RADIUS, 0);
    controls.update();
    controls.addEventListener("start", () => (userInteractingRef.current = true));
    controls.addEventListener("end", () => (userInteractingRef.current = false));
    controls.addEventListener("change", () => {
      if (controls.target.y < 0.01) {
        controls.target.y = 0.01;
        controls.update();
      }
    });

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 15, 10);
    scene.add(dir);

    // Golf course squares
    const courseGroup = new THREE.Group();
    const lightGreen = 0x8ee58e;
    const darkGreen = 0x76c776;
    const squareSize = 2.5;
    for (let i = 0; i < COURSE_SIZE_X / squareSize; i++) {
      for (let j = 0; j < COURSE_SIZE_Z / squareSize; j++) {
        const color = (i + j) % 2 === 0 ? lightGreen : darkGreen;
        const square = new THREE.Mesh(
          new THREE.BoxGeometry(squareSize, 0.1, squareSize),
          new THREE.MeshStandardMaterial({ color })
        );
        square.position.set(
          -COURSE_SIZE_X / 2 + squareSize / 2 + i * squareSize,
          0,
          -COURSE_SIZE_Z / 2 + squareSize / 2 + j * squareSize
        );
        courseGroup.add(square);
      }
    }
    scene.add(courseGroup);

    // Borders
    const borderHeight = 0.5;
    const borderMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const borders = [
      new THREE.BoxGeometry(COURSE_SIZE_X + 0.5, borderHeight, 0.5),
      new THREE.BoxGeometry(COURSE_SIZE_X + 0.5, borderHeight, 0.5),
      new THREE.BoxGeometry(0.5, borderHeight, COURSE_SIZE_Z + 0.5),
      new THREE.BoxGeometry(0.5, borderHeight, COURSE_SIZE_Z + 0.5),
    ];
    const positions = [
      [0, borderHeight / 2, -COURSE_SIZE_Z / 2 - 0.25],
      [0, borderHeight / 2, COURSE_SIZE_Z / 2 + 0.25],
      [-COURSE_SIZE_X / 2 - 0.25, borderHeight / 2, 0],
      [COURSE_SIZE_X / 2 + 0.25, borderHeight / 2, 0],
    ];
    borders.forEach((geo, i) => {
      const mesh = new THREE.Mesh(geo, borderMat);
      mesh.position.set(...positions[i]);
      scene.add(mesh);
    });

    // Water strip (horizontal, middle)
    const waterWidth = COURSE_SIZE_X;
    const waterDepth = 3;
    const waterGeo = new THREE.BoxGeometry(waterWidth, 0.1, waterDepth);
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, 0.05, 0);
    scene.add(water);

    // Flow direction indicator (animated arrows moving +X across water)
    const flowArrowY = 0.11; // slightly above water surface
    const flowRows = 5;
    const flowCols = 18;
    const flowSpeed = 2.2; // units/sec toward +X
    const flowInstCount = flowRows * flowCols;
    const flowPositions = new Array(flowInstCount);
    const dummy = new THREE.Object3D();

    // Flat triangle geometry lying on XZ plane, pointing +X
    const flowGeo = new THREE.BufferGeometry();
    const flowVerts = new Float32Array([
      -0.14, 0, -0.09,
      -0.14, 0,  0.09,
       0.22, 0,  0.0,
    ]);
    flowGeo.setAttribute("position", new THREE.BufferAttribute(flowVerts, 3));
    flowGeo.computeVertexNormals();
    const flowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    const flowMesh = new THREE.InstancedMesh(flowGeo, flowMat, flowInstCount);
    flowMesh.renderOrder = 2; // try to render above water

    const xMin = -COURSE_SIZE_X / 2;
    const xMax = COURSE_SIZE_X / 2;
    const zMin = -waterDepth / 2;
    const zMax = waterDepth / 2;
    const spacingX = COURSE_SIZE_X / flowCols;
    const spacingZ = (zMax - zMin) / (flowRows + 1);

    let idx = 0;
    for (let r = 0; r < flowRows; r++) {
      const z = zMin + spacingZ * (r + 1);
      // Stagger each row for a nicer pattern
      const xOffset = (r % 2 === 0 ? 0 : spacingX * 0.5);
      for (let c = 0; c < flowCols; c++) {
        const x = xMin + xOffset + c * spacingX;
        flowPositions[idx] = { x, z, s: 0.8 + Math.random() * 0.4 };
        dummy.position.set(x, flowArrowY, z);
        dummy.scale.setScalar(flowPositions[idx].s);
        dummy.updateMatrix();
        flowMesh.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
    flowMesh.instanceMatrix.needsUpdate = true;
    scene.add(flowMesh);

    // Ball
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.copy(startPos);
    ballRef.current = ball;
    scene.add(ball);

    // Hole
    const holeGeo = new THREE.CylinderGeometry(HOLE_RADIUS, HOLE_RADIUS, 0.05, 32);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(0, 0.025, -COURSE_SIZE_Z / 2 + 2);
    holeRef.current = hole;
    scene.add(hole);

    // Flag
    const flagGroup = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 6, 16);
    const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
    pole.position.set(0, 3, 0);
    flagGroup.add(pole);
    const flagGeo = new THREE.PlaneGeometry(1.5, 0.9);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.75, 6, 0);
    flagGroup.add(flag);
    flagGroup.position.copy(hole.position);
    flagRef.current = flagGroup;
    scene.add(flagGroup);

    // Aiming visuals: dynamic arrow + dots + power ticks
    const trajDots = [];
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = 0; i < 40; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), dotMat);
      d.visible = false;
      scene.add(d);
      trajDots.push(d);
    }
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const aimLine = new THREE.Line(lineGeom, lineMat);
    aimLine.visible = false;
    scene.add(aimLine);

    const arrowGroup = new THREE.Group();
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x4caf50 });
    const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 12);
    const shaft = new THREE.Mesh(shaftGeo, arrowMat);
    shaft.position.set(0, 0.5, 0);
    arrowGroup.add(shaft);
    const headHeight = 0.35;
    const headGeo = new THREE.ConeGeometry(0.12, headHeight, 16);
    const head = new THREE.Mesh(headGeo, arrowMat);
    head.position.set(0, 1 + headHeight / 2, 0);
    arrowGroup.add(head);
    arrowGroup.visible = false;
    scene.add(arrowGroup);

    const tickCount = 12;
    const powerTicks = [];
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.15 });
    for (let i = 0; i < tickCount; i++) {
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), tickMat.clone());
      tick.visible = false;
      scene.add(tick);
      powerTicks.push(tick);
    }

    // Aiming radius ring
    const ringGeo = new THREE.RingGeometry(AIM_RADIUS - 0.02, AIM_RADIUS + 0.02, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const aimRing = new THREE.Mesh(ringGeo, ringMat);
    aimRing.rotation.x = -Math.PI / 2;
    aimRing.position.set(0, 0.01, 0);
    scene.add(aimRing);

    // Confetti (Level 1)
    for (let i = 0; i < 50; i++) {
      const cGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const cMat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
      const c = new THREE.Mesh(cGeo, cMat);
      c.visible = false;
      scene.add(c);
      confettiPoolRef.current.push({ mesh: c, vel: new THREE.Vector3(), life: 0 });
    }
    function spawnConfetti(pos, n = 30) {
      let spawned = 0;
      for (const c of confettiPoolRef.current) {
        if (!c.mesh.visible && spawned < n) {
          c.mesh.position.copy(pos);
          c.vel.set((Math.random() - 0.5) * 5, Math.random() * 5 + 2, (Math.random() - 0.5) * 5);
          c.life = 2 + Math.random();
          c.mesh.visible = true;
          spawned++;
        }
      }
    }
    function updateConfetti(dt) {
      for (const c of confettiPoolRef.current) {
        if (!c.mesh.visible) continue;
        c.vel.y -= 9.8 * dt;
        c.mesh.position.addScaledVector(c.vel, dt);
        c.mesh.rotation.z += dt * 4;
        c.life -= dt;
        if (c.life <= 0 || c.mesh.position.y < -1) c.mesh.visible = false;
      }
    }

  // Mouse aiming (ported)
    const raycaster = new THREE.Raycaster();
    const tmpV2 = new THREE.Vector2();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    function getMousePointOnGround(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      tmpV2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      tmpV2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(tmpV2, camera);
      const p = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, p);
      return p;
    }
    function hexLerp(a, b, t) {
      const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
      const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
      const rr = Math.round(ar + (br - ar) * t);
      const rg = Math.round(ag + (bg - ag) * t);
      const rb = Math.round(ab + (bb - ab) * t);
      return (rr << 16) | (rg << 8) | rb;
    }
    function powerColor(pNorm) {
      const green = 0x4caf50, yellow = 0xffcc00, red = 0xff5252;
      if (pNorm <= 0.5) return hexLerp(green, yellow, pNorm / 0.5);
      return hexLerp(yellow, red, (pNorm - 0.5) / 0.5);
    }
    function updateAimingVisuals(previewEnd) {
      if (!ballRef.current) return;
      const ballPos = ballRef.current.position.clone().setY(BALL_RADIUS);
      const endPos = previewEnd.clone().setY(BALL_RADIUS);
      const segment = new THREE.Vector3().subVectors(endPos, ballPos);
      const distance = segment.length();
      const maxPower = 6;
      const clamped = Math.min(distance, maxPower);
      const pNorm = clamped / maxPower;
      const col = powerColor(pNorm);
      aimLine.visible = false;
      const maxDots = trajDots.length;
      const spacing = 0.25;
      const needed = Math.max(0, Math.min(maxDots, Math.floor(distance / spacing)));
      dotMat.color.setHex(col);
      for (let i = 0; i < maxDots; i++) {
        if (i < needed) {
          const t = (i + 1) / (needed + 1);
          trajDots[i].position.copy(ballPos).addScaledVector(segment, t);
          const s = 0.5 + 0.7 * pNorm;
          trajDots[i].scale.setScalar(s);
          trajDots[i].visible = true;
        } else {
          trajDots[i].visible = false;
        }
      }
      const dir = segment.clone();
      if (dir.lengthSq() < 1e-6) { arrowGroup.visible = false; return; }
      dir.y = 0;
      const dirLen = dir.length();
      const n = dir.clone().normalize();
      const shaftLen = Math.max(0.2, Math.max(0, dirLen - headHeight * 0.9));
      arrowGroup.position.copy(new THREE.Vector3(ballPos.x, BALL_RADIUS, ballPos.z));
      arrowGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(n.x, 0, n.z).normalize());
      shaft.scale.set(1, shaftLen, 1);
      shaft.position.set(0, shaftLen / 2, 0);
      head.position.set(0, shaftLen + headHeight / 2, 0);
      arrowMat.color.setHex(col);
      arrowGroup.visible = true;
      ringMat.color.setHex(col);
      const tickCount = powerTicks.length;
      const tickActive = Math.max(0, Math.min(tickCount, Math.round(pNorm * tickCount)));
      const tickRadius = AIM_RADIUS + 0.18;
      for (let i = 0; i < tickCount; i++) {
        const ang = (i / tickCount) * Math.PI * 2;
        const tx = ballRef.current.position.x + Math.cos(ang) * tickRadius;
        const tz = ballRef.current.position.z + Math.sin(ang) * tickRadius;
        const tMesh = powerTicks[i];
        tMesh.position.set(tx, 0.02, tz);
        tMesh.lookAt(ballRef.current.position.x, 0.02, ballRef.current.position.z);
        tMesh.material.color.setHex(col);
        tMesh.material.opacity = i < tickActive ? 1 : 0.15;
        tMesh.visible = true;
      }
    }

    function onPointerDown(e) {
      if (!ballRef.current) return;
      const p = getMousePointOnGround(e);
      const distXZ = new THREE.Vector2(p.x, p.z).distanceTo(new THREE.Vector2(ballRef.current.position.x, ballRef.current.position.z));
      if (distXZ < AIM_RADIUS) {
        isAimingRef.current = true;
        dragStartRef.current.copy(p);
        previewPointRef.current.copy(ballRef.current.position);
        aimLine.visible = false;
        arrowGroup.visible = true;
        for (const t of powerTicks) t.visible = true;
        if (controlsRef.current) controlsRef.current.enabled = false;
        renderer.domElement.setPointerCapture(e.pointerId);
      }
    }
    function onPointerMove(e) {
      if (!isAimingRef.current || !ballRef.current) return;
      const current = getMousePointOnGround(e);
      const dir = new THREE.Vector3().subVectors(dragStartRef.current, current);
      const maxPower = 6;
      const clampedLen = Math.min(dir.length(), maxPower);
      if (clampedLen > 0) dir.setLength(clampedLen);
      const targetPreview = new THREE.Vector3().addVectors(ballRef.current.position, dir);
      previewPointRef.current.lerp(targetPreview, 0.35);
      arrowGroup.visible = true;
      updateAimingVisuals(previewPointRef.current);
    }
    function onPointerUp(e) {
      if (!isAimingRef.current || !ballRef.current) return;
      isAimingRef.current = false;
  aimLine.visible = false;
  arrowGroup.visible = false;
      trajDots.forEach((d) => (d.visible = false));
  for (const t of powerTicks) t.visible = false;
      const release = getMousePointOnGround(e);
      const dir = new THREE.Vector3().subVectors(dragStartRef.current, release);
      const power = Math.min(dir.length(), 6);
      if (power > 0) {
        dir.setLength(power * 5);
        velocityRef.current.add(dir);
        setStrokes((s) => s + 1);
      }
      if (controlsRef.current) controlsRef.current.enabled = true;
      try { renderer.domElement.releasePointerCapture(e.pointerId); } catch {}
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });
    renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
    renderer.domElement.addEventListener("pointerup", onPointerUp, { passive: true });
    renderer.domElement.addEventListener("pointerleave", onPointerUp, { passive: true });

    // === Animate ===
    let last = performance.now();
    function animate() {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;

      if (ballRef.current) {
        const b = ballRef.current.position;
        const waterZ1 = -waterDepth / 2;
        const waterZ2 = waterDepth / 2;

        if (sinkingRef.current.active) {
          // Pull toward hole center and sink
          const hx = holeRef.current.position.x;
          const hz = holeRef.current.position.z;
          b.x += (hx - b.x) * Math.min(1, dt * 6);
          b.z += (hz - b.z) * Math.min(1, dt * 6);
          ballRef.current.position.y -= 1.5 * dt;
          if (ballRef.current.position.y < -1) ballRef.current.visible = false;
          // stop any residual motion
          velocityRef.current.set(0, 0, 0);
        } else {
          // Water flow stronger than ball velocity
          if (b.z > waterZ1 && b.z < waterZ2) {
            velocityRef.current.x = Math.max(velocityRef.current.x, 4); // fixed strong push
          }

          // Ball physics (Level 1 style)
          ballRef.current.position.addScaledVector(velocityRef.current, dt);
          velocityRef.current.multiplyScalar(Math.max(0, 1 - dt * 2));

          // Respawn if off course
          if (
            b.x < -COURSE_SIZE_X / 2 ||
            b.x > COURSE_SIZE_X / 2 ||
            b.z < -COURSE_SIZE_Z / 2 ||
            b.z > COURSE_SIZE_Z / 2
          ) {
            ballRef.current.position.copy(startPos);
            velocityRef.current.set(0, 0, 0);
          }

          // Hole detection (planar XZ distance with tolerance for ball radius)
          const dx = b.x - holeRef.current.position.x;
          const dz = b.z - holeRef.current.position.z;
          const dist = Math.hypot(dx, dz);
          const captureRadius = HOLE_RADIUS + BALL_RADIUS * 0.4;
          if (!holeTriggeredRef.current && dist <= captureRadius) {
            holeTriggeredRef.current = true;
            sinkingRef.current.active = true;
            setHoleDone(true);
            spawnConfetti(ballRef.current.position, 30);
            const audio = new Audio("/audio/celebration.mp3");
            audio.play();
          }
        }
      }

      // Update water flow indicators (drift +X and wrap)
      if (flowMesh) {
        for (let i = 0; i < flowInstCount; i++) {
          const p = flowPositions[i];
          p.x += flowSpeed * dt;
          if (p.x > xMax + 0.3) p.x = xMin - 0.3; // wrap around
          dummy.position.set(p.x, flowArrowY, p.z);
          dummy.scale.setScalar(p.s);
          dummy.updateMatrix();
          flowMesh.setMatrixAt(i, dummy.matrix);
        }
        flowMesh.instanceMatrix.needsUpdate = true;
      }

      updateConfetti(dt);

      // Keep aiming ring centered on ball
      if (ballRef.current) {
        aimRing.position.set(ballRef.current.position.x, 0.01, ballRef.current.position.z);
      }

      // Gentle follow of controls target when ball is moving and user not interacting
      if (ballRef.current) {
        const moving = velocityRef.current.lengthSq() > 1e-6;
        if (moving && !isAimingRef.current && !userInteractingRef.current) {
          const desired = new THREE.Vector3(ballRef.current.position.x, BALL_RADIUS, ballRef.current.position.z);
          controls.target.lerp(desired, 0.08);
          if (controls.target.y < 0.01) controls.target.y = 0.01;
        }
      }

      controls.update();

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    return () => {
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />
      <ScoreBadge hole={3} par={par} strokes={strokes} />
      {holeDone && <div className="hole-done-msg">Hole Completed! 🎉</div>}
      {holeDone && (
        <EndOfLevelModal
          strokes={strokes}
          onNext={onNext}
          onRetry={onRetry}
          onMainMenu={onMainMenu}
        />
      )}
    </>
  );
}
