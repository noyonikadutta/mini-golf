// src/scene/Canvas3D_Level2.jsx
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const BALL_RADIUS = 0.3;
const HOLE_RADIUS = 0.5;
const COURSE_SIZE_X = 14;
const COURSE_SIZE_Z = 20;

export default function Canvas3D_Level2() {
  const mountRef = useRef();
  const ballRef = useRef();
  const holeRef = useRef();
  const flagRef = useRef();
  const confettiPoolRef = useRef([]);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const sinkingRef = useRef({ active: false });
  const holeTriggeredRef = useRef(false);
  const obstacleRefs = useRef([]);

  const [strokes, setStrokes] = useState(0);
  const [par] = useState(4);
  const [holeDone, setHoleDone] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;

    // === Scene + Camera + Renderer ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb3d9ff); // surroundings blueish

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;

    // === Lighting ===
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 15, 10);
    scene.add(dir);

    // === Golf Course ===
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
        square.position.set(-COURSE_SIZE_X / 2 + squareSize / 2 + i * squareSize, 0, -COURSE_SIZE_Z / 2 + squareSize / 2 + j * squareSize);
        courseGroup.add(square);
      }
    }
    scene.add(courseGroup);

    // === Boundaries ===
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

    // === Ball ===
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, BALL_RADIUS, COURSE_SIZE_Z / 2 - 2);
    ballRef.current = ball;
    scene.add(ball);

    // === Hole ===
    const holeGeo = new THREE.CylinderGeometry(HOLE_RADIUS, HOLE_RADIUS, 0.05, 32);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(0, 0.025, -COURSE_SIZE_Z / 2 + 2);
    holeRef.current = hole;
    scene.add(hole);

    // === Flag ===
    const flagGroup = new THREE.Group();
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 6, 16);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(0, 3, 0);
    flagGroup.add(pole);
    const flagGeo = new THREE.PlaneGeometry(1.5, 0.9);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(0.75, 6, 0);
    flag.rotation.y = 0;
    flagGroup.add(flag);
    flagGroup.position.copy(hole.position);
    flagRef.current = flagGroup;
    scene.add(flagGroup);

    // === Moving Obstacles ===
    const obstacles = [];
    const speeds = [1.5, 2.0, 1.2, 1.8];
    const phases = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.BoxGeometry(2, 1, 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const mesh = new THREE.Mesh(geo, mat);
      const z = -COURSE_SIZE_Z / 2 + 4 + i * 3; // staggered along Z
      mesh.position.set(Math.sin(phases[i]) * 5, 0.5, z);
      scene.add(mesh);
      obstacles.push({ mesh, speed: speeds[i], phase: phases[i], z });
    }
    obstacleRefs.current = obstacles;

    // === Trajectory Dots ===
    const trajDots = [];
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = 0; i < 40; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), dotMat);
      d.visible = false;
      scene.add(d);
      trajDots.push(d);
    }

    // === Arrow ===
    const arrowMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const arrowGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const arrow = new THREE.Line(arrowGeom, arrowMat);
    arrow.visible = false;
    scene.add(arrow);

    // === Confetti ===
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

    // === Mouse Input & Trajectory ===
    let isAiming = false;
    let dragStart = null;
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

    function simulateTrajectory(start, vel) {
      const points = [];
      const simPos = start.clone();
      const simVel = vel.clone();
      const dt = 0.06;
      for (let i = 0; i < trajDots.length; i++) {
        if (simVel.lengthSq() < 1e-6) break;
        simPos.addScaledVector(simVel, dt);
        points.push(simPos.clone());
        const s = simVel.length();
        simVel.setLength(Math.max(0, s - 1.5 * dt));
      }
      return points;
    }

    function onPointerDown(e) {
      const p = getMousePointOnGround(e);
      if (!ballRef.current) return;
      if (p.distanceTo(ballRef.current.position) < 1.2) {
        isAiming = true;
        dragStart = p.clone();
        arrow.visible = true;
      }
    }
    function onPointerMove(e) {
      if (!isAiming) return;
      const current = getMousePointOnGround(e);
      const dir = new THREE.Vector3().subVectors(dragStart, current);
      const length = Math.min(dir.length(), 6);
      dir.setLength(length);
      const arrowEnd = new THREE.Vector3().addVectors(ballRef.current.position, dir);
      arrow.geometry.setFromPoints([ballRef.current.position.clone().setY(BALL_RADIUS), arrowEnd.clone().setY(BALL_RADIUS)]);
      const sim = simulateTrajectory(ballRef.current.position.clone(), dir.clone().multiplyScalar(5));
      trajDots.forEach((d, i) => {
        if (i < sim.length) { d.position.copy(sim[i]).setY(BALL_RADIUS); d.visible = true; }
        else d.visible = false;
      });
    }
    function onPointerUp(e) {
      if (!isAiming) return;
      isAiming = false;
      arrow.visible = false;
      trajDots.forEach(d => (d.visible = false));
      const release = getMousePointOnGround(e);
      const dir = new THREE.Vector3().subVectors(dragStart, release);
      const power = Math.min(dir.length(), 6);
      dir.setLength(power * 5);
      velocityRef.current.add(dir);
      setStrokes(s => s + 1);
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });
    renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
    renderer.domElement.addEventListener("pointerup", onPointerUp, { passive: true });
    renderer.domElement.addEventListener("pointerleave", onPointerUp, { passive: true });

    // === Animation ===
    let last = performance.now();
    function animate(now) {
      const dt = (now - last) / 1000;
      last = now;

      // Move obstacles
      obstacleRefs.current.forEach((obs, i) => {
        obs.phase += obs.speed * dt;
        obs.mesh.position.x = Math.sin(obs.phase) * (COURSE_SIZE_X / 2 - 1.5);
      });

      // velocity -> position
      if (!sinkingRef.current.active) {
        const vel = velocityRef.current;
        if (vel.lengthSq() > 1e-6) {
          const speed = vel.length();
          const decel = 1.5 * dt;
          vel.setLength(Math.max(0, speed - decel));
          ballRef.current.position.addScaledVector(vel, dt);

          // bounce off borders
          const limitX = COURSE_SIZE_X / 2;
          const limitZ = COURSE_SIZE_Z / 2;
          if (ballRef.current.position.x < -limitX) { ballRef.current.position.x = -limitX; vel.x *= -0.7; }
          if (ballRef.current.position.x > limitX) { ballRef.current.position.x = limitX; vel.x *= -0.7; }
          if (ballRef.current.position.z < -limitZ) { ballRef.current.position.z = -limitZ; vel.z *= -0.7; }
          if (ballRef.current.position.z > limitZ) { ballRef.current.position.z = limitZ; vel.z *= -0.7; }

          // obstacle collisions
          obstacleRefs.current.forEach(obs => {
            const obsBox = new THREE.Box3().setFromObject(obs.mesh);
            const ballBox = new THREE.Sphere(ballRef.current.position, BALL_RADIUS);
            if (obsBox.intersectsSphere(ballBox)) {
              vel.negate().multiplyScalar(0.6);
              ballRef.current.position.addScaledVector(vel, dt);
            }
          });

          // ball-in-hole detection
          const distToHole = ballRef.current.position.distanceTo(holeRef.current.position);
          if (!holeTriggeredRef.current && distToHole < HOLE_RADIUS) {
            holeTriggeredRef.current = true;
            sinkingRef.current.active = true;
            spawnConfetti(ballRef.current.position);
            const audio = new Audio("/audio/celebration.mp3");
            audio.play();
            setHoleDone(true);
          }
        }
      } else {
        ballRef.current.position.y -= 1.5 * dt;
        if (ballRef.current.position.y < -1) ballRef.current.visible = false;
      }

      updateConfetti(dt);

      // camera follows ball smoothly
      const targetPos = ballRef.current.position.clone().add(new THREE.Vector3(0, 6, 12));
      camera.position.lerp(targetPos, 0.05);
      camera.lookAt(ballRef.current.position);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate(performance.now());

    return () => { mount.removeChild(renderer.domElement); };
  }, []);

  return (
    <>
      <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />
      <div style={{ position: "absolute", top: 10, left: 10, padding: "5px 10px", backgroundColor: "rgba(255,255,255,0.7)", fontFamily: "sans-serif" }}>
        <div>Strokes: {strokes}</div>
        <div>Par: {par}</div>
        {holeDone && <div style={{ color: "green" }}>Hole Completed! 🎉</div>}
      </div>
    </>
  );
}
