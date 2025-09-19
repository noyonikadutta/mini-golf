import React, { useEffect, useRef, useState } from "react";
import ScoreBadge from "../ui/ScoreBadge";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const BALL_RADIUS = 0.3;
const HOLE_RADIUS = 0.5;
const COURSE_SIZE_X = 14;
const COURSE_SIZE_Z = 20;
const AIM_RADIUS = 1.2; // radius where aiming takes precedence

export default function Canvas3D() {
  const mountRef = useRef(null);
  const ballRef = useRef(null);
  const holeRef = useRef(null);
  const flagRef = useRef(null);
  const confettiPoolRef = useRef([]);

  // Physics
  const velocityRef = useRef(new THREE.Vector3());
  const sinkingRef = useRef({ active: false });
  const holeTriggeredRef = useRef(false);

  // Aiming
  const isAimingRef = useRef(false);
  const dragStartRef = useRef(new THREE.Vector3());
  const previewPointRef = useRef(new THREE.Vector3());

  // Camera/controls
  const controlsRef = useRef(null);
  const userInteractingRef = useRef(false);

  const [strokes, setStrokes] = useState(0);
  const [par] = useState(3);
  const [holeDone, setHoleDone] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb3d9ff);

    // Camera + Renderer
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

  // Eye-level camera, slightly farther to reduce initial zoom-in
  camera.position.set(0, 3, 18);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
  // Keep panning on the horizontal plane and avoid below-ground
  controls.screenSpacePanning = false; // world-up panning
  controls.minPolarAngle = 0.1; // avoid perfectly top-down
  controls.maxPolarAngle = Math.PI / 2 - 0.01; // never go below the horizon
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controlsRef.current = controls;

    // Track when the user is actively manipulating the view
    controls.addEventListener("start", () => {
      userInteractingRef.current = true;
    });
    controls.addEventListener("end", () => {
      userInteractingRef.current = false;
    });

    // Reasonable initial target to view the course center
    controls.target.set(0, BALL_RADIUS, 0);
    controls.update();
    // Clamp target Y so user cannot pan below ground level
    controls.addEventListener("change", () => {
      if (controls.target.y < 0.01) {
        controls.target.y = 0.01;
        controls.update();
      }
    });

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 15, 10);
    scene.add(dir);

    // Course (checkerboard)
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

  // Ball
    const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, BALL_RADIUS, COURSE_SIZE_Z / 2 - 2);
  ballRef.current = ball;
    scene.add(ball);
  // After ball exists, look at it from eye level
  controls.target.set(ball.position.x, BALL_RADIUS, ball.position.z);
  controls.update();

  // Aiming radius indicator (thin ring on the ground)
  const ringGeo = new THREE.RingGeometry(AIM_RADIUS - 0.02, AIM_RADIUS + 0.02, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  const aimRing = new THREE.Mesh(ringGeo, ringMat);
  aimRing.rotation.x = -Math.PI / 2;
  aimRing.position.set(ball.position.x, 0.01, ball.position.z);
  scene.add(aimRing);

    // Hole
    const holeRadius = 0.35;
    const holeHeight = 0.05;
    const holeGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, holeHeight, 32);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.set(0, holeHeight / 2, -COURSE_SIZE_Z / 2 + 2);
    holeRef.current = hole;
    scene.add(hole);

    // Flag
    const flagGroup = new THREE.Group();
    const poleHeight = 6;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, poleHeight, 16),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    pole.position.set(0, poleHeight / 2, 0);
    flagGroup.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide })
    );
    flag.position.set(0.75, poleHeight, 0);
    flag.rotation.y = 0;
    flagGroup.add(flag);
    flagGroup.position.copy(hole.position);
    flagRef.current = flagGroup;
    scene.add(flagGroup);

    // Obstacle (same as Level1)
    const obstacleGeo = new THREE.BoxGeometry(2, 1, 2);
    const obstacleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);
    obstacle.position.set(0, 0.5, 0);
    scene.add(obstacle);

    // Aiming visuals: straight red line + evenly spaced dots
    const dotCount = 40;
    const trajDots = [];
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (let i = 0; i < dotCount; i++) {
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

    // Confetti pool (same behavior)
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

    // Helpers
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

    function updateAimingVisuals(previewEnd) {
      // Straight line from ball to preview point (at ball height)
      const ballPos = ballRef.current.position.clone().setY(BALL_RADIUS);
      const endPos = previewEnd.clone().setY(BALL_RADIUS);
      aimLine.geometry.setFromPoints([ballPos, endPos]);

      // Evenly spaced dots between ball and preview
      const segment = new THREE.Vector3().subVectors(endPos, ballPos);
      const distance = segment.length();
      const maxDots = trajDots.length;
      const spacing = 0.25; // meters between dots
      const needed = Math.max(0, Math.min(maxDots, Math.floor(distance / spacing)));
      for (let i = 0; i < maxDots; i++) {
        if (i < needed) {
          const t = (i + 1) / (needed + 1);
          trajDots[i].position.copy(ballPos).addScaledVector(segment, t);
          trajDots[i].visible = true;
        } else {
          trajDots[i].visible = false;
        }
      }
    }

    // Pointer events (clean, self-contained)
    function onPointerDown(e) {
      if (!ballRef.current) return;
      const p = getMousePointOnGround(e);
      const distXZ = new THREE.Vector2(p.x, p.z).distanceTo(new THREE.Vector2(ballRef.current.position.x, ballRef.current.position.z));
      if (distXZ < AIM_RADIUS) {
        isAimingRef.current = true;
        dragStartRef.current.copy(p);
        previewPointRef.current.copy(ballRef.current.position);
        aimLine.visible = true;
        // Temporarily disable OrbitControls while aiming
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

      // Simple smoothing to reduce jitter (without using animation loop)
      previewPointRef.current.lerp(targetPreview, 0.35);

      aimLine.visible = true;
      updateAimingVisuals(previewPointRef.current);
    }

    function onPointerUp(e) {
      if (!isAimingRef.current || !ballRef.current) return;
      isAimingRef.current = false;
      aimLine.visible = false;
      for (const d of trajDots) d.visible = false;

      const release = getMousePointOnGround(e);
      const dir = new THREE.Vector3().subVectors(dragStartRef.current, release);
      const power = Math.min(dir.length(), 6);
      if (power > 0) {
        dir.setLength(power * 5);
        velocityRef.current.add(dir);
        setStrokes((s) => s + 1);
      }
      // Re-enable OrbitControls
      if (controlsRef.current) controlsRef.current.enabled = true;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {}
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });
    renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
    renderer.domElement.addEventListener("pointerup", onPointerUp, { passive: true });
    renderer.domElement.addEventListener("pointerleave", onPointerUp, { passive: true });

    // Window resize
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    // Animation loop — physics, camera rig follow, controls
    let last = performance.now();
    function animate(now) {
      const dt = (now - last) / 1000;
      last = now;

      // Physics (identical to Level1)
      if (!sinkingRef.current.active) {
        const vel = velocityRef.current;
        if (vel.lengthSq() > 1e-6) {
          const speed = vel.length();
          const decel = 1.5 * dt;
          vel.setLength(Math.max(0, speed - decel));
          ballRef.current.position.addScaledVector(vel, dt);

          // Borders bounce
          const limitX = COURSE_SIZE_X / 2;
          const limitZ = COURSE_SIZE_Z / 2;
          if (ballRef.current.position.x < -limitX) {
            ballRef.current.position.x = -limitX;
            vel.x *= -0.7;
          }
          if (ballRef.current.position.x > limitX) {
            ballRef.current.position.x = limitX;
            vel.x *= -0.7;
          }
          if (ballRef.current.position.z < -limitZ) {
            ballRef.current.position.z = -limitZ;
            vel.z *= -0.7;
          }
          if (ballRef.current.position.z > limitZ) {
            ballRef.current.position.z = limitZ;
            vel.z *= -0.7;
          }

          // Obstacle basic collision
          const obsBox = new THREE.Box3().setFromObject(obstacle);
          const ballBox = new THREE.Sphere(ballRef.current.position, BALL_RADIUS);
          if (obsBox.intersectsSphere(ballBox)) {
            vel.negate().multiplyScalar(0.6);
            ballRef.current.position.addScaledVector(vel, dt);
          }

          // Hole detection
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
        // Sinking animation
        ballRef.current.position.y -= 1.5 * dt;
        if (ballRef.current.position.y < -1) ballRef.current.visible = false;
      }

      updateConfetti(dt);

      // Keep the aiming ring centered on the ball (XZ plane)
      if (ballRef.current) {
        aimRing.position.set(ballRef.current.position.x, 0.01, ballRef.current.position.z);
      }

      // Gentle follow: while ball moving and not aiming or user rotating/panning,
      // ease the controls target toward the ball to keep it in view
      if (ballRef.current) {
        const moving = velocityRef.current.lengthSq() > 1e-6;
        if (moving && !isAimingRef.current && !userInteractingRef.current) {
          const desired = new THREE.Vector3(
            ballRef.current.position.x,
            BALL_RADIUS,
            ballRef.current.position.z
          );
          controlsRef.current.target.lerp(desired, 0.08);
          // Clamp Y to stay above ground
          if (controlsRef.current.target.y < 0.01) controlsRef.current.target.y = 0.01;
        }
      }

      // No camera following; OrbitControls handles user panning/zooming/rotation

      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    // Nothing to initialize for a fixed camera beyond initial target
    requestAnimationFrame(animate);

    // Cleanup
    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <>
      <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />
      <ScoreBadge hole={1} par={par} strokes={strokes} />
      {holeDone && <div className="hole-done-msg">Hole Completed! 🎉</div>}
    </>
  );
}
