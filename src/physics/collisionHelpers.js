// src/scene/utils/collisionHelpers.js
import * as THREE from "three";

// Simple sphere vs box intersection helper
export function sphereIntersectsBox(sphere, box) {
  // sphere: THREE.Sphere
  // box: THREE.Box3
  return box.intersectsSphere(sphere);
}
