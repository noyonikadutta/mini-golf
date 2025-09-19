// src/scene/Canvas3D_Level3.jsx
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const BALL_RADIUS = 0.3;
const HOLE_RADIUS = 0.5;
const COURSE_SIZE_X = 14;
const COURSE_SIZE_Z = 20;

export default function Canvas3D_Level3() {
  const mountRef = useRef();
  const ballRef = useRef();
  const holeRef = useRef();
  const flagRef = useRef();
  const confettiPoolRef = useRef([]);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const holeTriggeredRef = useRef(false);

  const [strokes, setStrokes] = useState(0);
  const [par] = useState(3);
  const [holeDone, setHoleDone] = useState(false);

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
    camera.position.set(0, 8, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;

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

    // Trajectory dots (Yellow, exactly like Level 1)
    const trajDots = [];
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = 0; i < 40; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), dotMat);
      d.visible = false;
      scene.add(d);
      trajDots.push(d);
    }

    // Arrow (Level 1 style)
    const arrowMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const arrowGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const arrow = new THREE.Line(arrowGeom, arrowMat);
    arrow.visible = false;
    scene.add(arrow);

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

    // Mouse aiming (Level 1 exact)
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
      if (p.distanceTo(ballRef.current.position) < 2) {
        isAiming = true;
        dragStart = p;
      }
    }
    function onPointerMove(e) {
      if (!isAiming) return;
      const p = getMousePointOnGround(e);
      const delta = dragStart.clone().sub(p);
      velocityRef.current.copy(delta.multiplyScalar(2));
      const traj = simulateTrajectory(ballRef.current.position, velocityRef.current);
      for (let i = 0; i < trajDots.length; i++) {
        if (traj[i]) {
          trajDots[i].position.copy(traj[i]);
          trajDots[i].visible = true;
        } else trajDots[i].visible = false;
      }
    }
    function onPointerUp() {
      if (!isAiming) return;
      isAiming = false;
      dragStart = null;
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

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

        // Water flow stronger than ball velocity
        if (b.z > waterZ1 && b.z < waterZ2) {
          velocityRef.current.x = Math.max(velocityRef.current.x, 4); // fixed strong push
        }

        // Ball physics (Level 1)
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

        // Hole detection
        const dist = b.distanceTo(holeRef.current.position);
        if (!holeTriggeredRef.current && dist < HOLE_RADIUS) {
          holeTriggeredRef.current = true;
          setHoleDone(true);
          spawnConfetti(ballRef.current.position, 30);
        }
      }

      updateConfetti(dt);

      // Camera follow (Level 1)
      camera.position.lerp(
        new THREE.Vector3(ballRef.current.position.x, 8, ballRef.current.position.z + 12),
        0.05
      );
      camera.lookAt(ballRef.current.position);

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
    <div>
      <div ref={mountRef} />
      <div className="ui-overlay">
        <div>Strokes: {strokes}</div>
        <div>Par: {par}</div>
        {holeDone && <div>HOLE COMPLETED!</div>}
      </div>
    </div>
  );
}
