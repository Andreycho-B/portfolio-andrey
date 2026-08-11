import * as THREE from 'three'

export interface ClusterBody {
  id: string
  object3D: THREE.Object3D
  mass: number
  velocity: THREE.Vector3
  homePosition: THREE.Vector3
  homeRotation: THREE.Euler
}

export interface ClusterFrameOptions {
  center: THREE.Vector3
  gravityStrength: number
  dampingLambda: number
  maxSpeed: number
  epsilon: number
}

const DAMPING_LAMBDA_0_96_AT_60FPS = 2.45
const MAX_SPEED_DEFAULT = 4.0
const EPSILON_DEFAULT = 0.0005

export function createClusterBody(
  id: string,
  object3D: THREE.Object3D,
  mass: number,
): ClusterBody {
  const clampedMass = THREE.MathUtils.clamp(mass, 1.0, 2.0)
  return {
    id,
    object3D,
    mass: clampedMass,
    velocity: new THREE.Vector3(),
    homePosition: object3D.position.clone(),
    homeRotation: object3D.rotation.clone(),
  }
}

export function createClusterFrameOptions(center: THREE.Vector3): ClusterFrameOptions {
  return {
    center,
    gravityStrength: 0.7,
    dampingLambda: DAMPING_LAMBDA_0_96_AT_60FPS,
    maxSpeed: MAX_SPEED_DEFAULT,
    epsilon: EPSILON_DEFAULT,
  }
}

function applyCentralGravity(body: ClusterBody, opts: ClusterFrameOptions, dt: number): void {
  const dir = new THREE.Vector3().subVectors(opts.center, body.object3D.position)
  const dist = dir.length()
  if (dist <= opts.epsilon) return
  const acc = dir.normalize()
    .multiplyScalar(opts.gravityStrength / body.mass / Math.max(dist * dist, 0.04))
  body.velocity.addScaledVector(acc, dt)
}

function dampVelocity(body: ClusterBody, lambda: number, dt: number): void {
  body.velocity.x = THREE.MathUtils.damp(body.velocity.x, 0, lambda, dt)
  body.velocity.y = THREE.MathUtils.damp(body.velocity.y, 0, lambda, dt)
  body.velocity.z = THREE.MathUtils.damp(body.velocity.z, 0, lambda, dt)
}

function applyImpulse(body: ClusterBody, force: THREE.Vector3): void {
  body.velocity.addScaledVector(force, 1 / body.mass)
}

function integrate(body: ClusterBody, dt: number, maxSpeed: number): void {
  body.velocity.clampLength(0, maxSpeed)
  body.object3D.position.addScaledVector(body.velocity, dt)
  if (body.velocity.lengthSq() < 0.0001) {
    body.velocity.set(0, 0, 0)
  }
}

function computeRadialBlurSpeed(
  bodies: ClusterBody[],
  center: THREE.Vector3,
): number {
  let total = 0
  let weight = 0
  for (const body of bodies) {
    const distFromCenter = body.object3D.position.distanceTo(center)
    const speed = body.velocity.length()
    const w = 1 + distFromCenter
    total += speed * w
    weight += w
  }
  return weight > 0 ? total / weight : 0
}

export function composeClusterFrame(
  bodies: ClusterBody[],
  opts: ClusterFrameOptions,
  dt: number,
): number {
  for (const body of bodies) {
    applyCentralGravity(body, opts, dt)
    dampVelocity(body, opts.dampingLambda, dt)
    integrate(body, dt, opts.maxSpeed)
  }
  return computeRadialBlurSpeed(bodies, opts.center)
}

export function applyScrollImpulse(
  bodies: ClusterBody[],
  scrollDelta: number,
  impulseStrength: number,
): void {
  if (Math.abs(scrollDelta) < 0.001) return
  const force = new THREE.Vector3(0, -scrollDelta * impulseStrength, 0)
  for (const body of bodies) {
    applyImpulse(body, force)
  }
}

export type { ClusterBody as _ClusterBody }