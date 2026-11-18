import * as THREE from 'three';
import { DiscParams } from '../types/engineering';

/**
 * Builds a clean, watertight composite THREE.Group for the parametric seed disc
 * in millimeter scale, Z-up (flat on print bed, cells facing +Z).
 */
export function buildParametricDiscGroup(
  params: DiscParams,
  material: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  group.name = `SeederDisc_${params.variantId}`;

  const R = params.outerDiameter / 2;
  const Rp = params.pitchDiameter / 2;
  const rCell = params.cellDiameter / 2;
  const boreR = (params.shaftDiameter + params.printClearance) / 2;
  const dFlatOffset = boreR - 0.8;
  const N = params.cellCount;
  const chamfer = Math.min(params.entryChamfer, params.cellDepth * 0.55);
  const floorH = Math.max(1.2, params.thickness - params.cellDepth);
  const wallH = Math.max(0.5, params.cellDepth - chamfer);
  const encR = 27.0; // optical encoder pitch radius (mm)

  const addDShaftAndMountHoles = (shape: THREE.Shape) => {
    // Central D-shaped shaft bore
    const borePath = new THREE.Path();
    const flatAngle = Math.acos(Math.min(0.99, Math.max(-0.99, dFlatOffset / boreR)));
    const segments = 32;
    const startA = flatAngle;
    const endA = Math.PI * 2 - flatAngle;
    for (let i = 0; i <= segments; i++) {
      const a = startA + (i / segments) * (endA - startA);
      const x = Math.cos(a) * boreR;
      const y = Math.sin(a) * boreR;
      if (i === 0) borePath.moveTo(x, y);
      else borePath.lineTo(x, y);
    }
    borePath.closePath();
    shape.holes.push(borePath);

    // 3x M3 mounting / alignment holes at R = 12mm
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const hole = new THREE.Path();
      hole.absarc(Math.cos(a) * 12, Math.sin(a) * 12, 1.65, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }

    // Optical encoder slots at R = 27mm (1 slot per cell)
    for (let i = 0; i < N; i++) {
      const a = (i * Math.PI * 2) / N;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);
      const halfL = 2.8;
      const halfW = 1.5;
      const cx = cosA * encR;
      const cy = sinA * encR;
      const tx = -sinA;
      const ty = cosA;

      const slot = new THREE.Path();
      slot.moveTo(cx - cosA * halfL - tx * halfW, cy - sinA * halfL - ty * halfW);
      slot.lineTo(cx + cosA * halfL - tx * halfW, cy + sinA * halfL - ty * halfW);
      slot.lineTo(cx + cosA * halfL + tx * halfW, cy + sinA * halfL + ty * halfW);
      slot.lineTo(cx - cosA * halfL + tx * halfW, cy - sinA * halfL + ty * halfW);
      slot.closePath();
      shape.holes.push(slot);
    }
  };

  // Layer 1: Bottom solid floor (Z: 0 -> floorH)
  const floorShape = new THREE.Shape();
  floorShape.absarc(0, 0, R, 0, Math.PI * 2, false);
  addDShaftAndMountHoles(floorShape);

  const floorGeo = new THREE.ExtrudeGeometry(floorShape, {
    depth: floorH,
    bevelEnabled: false,
    curveSegments: 64,
  });
  const floorMesh = new THREE.Mesh(floorGeo, material);
  floorMesh.castShadow = true;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Layer 2: Cell wall section (Z: floorH -> floorH + wallH)
  const wallShape = new THREE.Shape();
  wallShape.absarc(0, 0, R, 0, Math.PI * 2, false);
  addDShaftAndMountHoles(wallShape);

  for (let i = 0; i < N; i++) {
    const a = (i * Math.PI * 2) / N;
    const cellHole = new THREE.Path();
    cellHole.absarc(Math.cos(a) * Rp, Math.sin(a) * Rp, rCell, 0, Math.PI * 2, true);
    wallShape.holes.push(cellHole);
  }

  const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
    depth: wallH,
    bevelEnabled: false,
    curveSegments: 64,
  });
  const wallMesh = new THREE.Mesh(wallGeo, material);
  wallMesh.position.z = floorH;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  group.add(wallMesh);

  // Layer 3: Entry chamfer top plate + conical bevel collars (if entryChamfer > 0)
  if (chamfer > 0.05) {
    const rTop = rCell + chamfer;
    const topShape = new THREE.Shape();
    topShape.absarc(0, 0, R, 0, Math.PI * 2, false);
    addDShaftAndMountHoles(topShape);

    for (let i = 0; i < N; i++) {
      const a = (i * Math.PI * 2) / N;
      const cellHole = new THREE.Path();
      cellHole.absarc(Math.cos(a) * Rp, Math.sin(a) * Rp, rTop, 0, Math.PI * 2, true);
      topShape.holes.push(cellHole);
    }

    const topGeo = new THREE.ExtrudeGeometry(topShape, {
      depth: chamfer,
      bevelEnabled: false,
      curveSegments: 64,
    });
    const topMesh = new THREE.Mesh(topGeo, material);
    topMesh.position.z = floorH + wallH;
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // Conical chamfer collar for each cell (triangular cross-section revolved around Y, rotated to Z-up)
    const lathePts = [
      new THREE.Vector2(rCell, 0),
      new THREE.Vector2(rTop, 0),
      new THREE.Vector2(rTop, chamfer),
      new THREE.Vector2(rCell, 0),
    ];
    const collarGeo = new THREE.LatheGeometry(lathePts, 36);
    collarGeo.rotateX(Math.PI / 2);

    for (let i = 0; i < N; i++) {
      const a = (i * Math.PI * 2) / N;
      const collarMesh = new THREE.Mesh(collarGeo, material);
      collarMesh.position.set(Math.cos(a) * Rp, Math.sin(a) * Rp, floorH + wallH);
      collarMesh.castShadow = true;
      collarMesh.receiveShadow = true;
      group.add(collarMesh);
    }
  }

  return group;
}

/**
 * Builds printable housing & hopper STL mesh group (in mm, Z-up).
 */
export function buildHousingPrintGroup(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SeederHousing';

  const outerR = 66.0;
  const cavityR = 61.5;
  const backWall = 4.0;
  const pocketDepth = 11.2;

  // Backplate with discharge window & shaft bore
  const backShape = new THREE.Shape();
  backShape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const shaftHole = new THREE.Path();
  shaftHole.absarc(0, 0, 5.25, 0, Math.PI * 2, true);
  backShape.holes.push(shaftHole);
  const dischargeHole = new THREE.Path();
  dischargeHole.absarc(0, -47.0, 7.5, 0, Math.PI * 2, true);
  backShape.holes.push(dischargeHole);

  const backGeo = new THREE.ExtrudeGeometry(backShape, {
    depth: backWall,
    bevelEnabled: false,
    curveSegments: 64,
  });
  const backMesh = new THREE.Mesh(backGeo, material);
  group.add(backMesh);

  // Outer ring wall around disc cavity (leaving discharge opening at bottom)
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, outerR, -Math.PI * 0.42, Math.PI * 1.42, false);
  ringShape.absarc(0, 0, cavityR, Math.PI * 1.42, -Math.PI * 0.42, true);
  ringShape.closePath();

  const ringGeo = new THREE.ExtrudeGeometry(ringShape, {
    depth: pocketDepth,
    bevelEnabled: false,
    curveSegments: 64,
  });
  const ringMesh = new THREE.Mesh(ringGeo, material);
  ringMesh.position.z = backWall;
  group.add(ringMesh);

  // Base mounting flange in XZ plane WITH real vertical Ø17mm seed discharge hole at (x=0, z=9)
  const baseShape = new THREE.Shape();
  baseShape.moveTo(-66, -1);
  baseShape.lineTo(66, -1);
  baseShape.lineTo(66, 19);
  baseShape.lineTo(-66, 19);
  baseShape.closePath();

  // Real vertical through-hole for seed drop (R = 8.5 mm -> Ø17 mm centered at x=0, z=9!)
  const dropHole = new THREE.Path();
  dropHole.absarc(0, 9.0, 8.5, 0, Math.PI * 2, true);
  baseShape.holes.push(dropHole);

  // Left & right vertical M5 mounting holes for attaching to aluminum 2020 frame
  for (const mx of [-52, 52]) {
    const boltHole = new THREE.Path();
    boltHole.absarc(mx, 9.0, 2.75, 0, Math.PI * 2, true);
    baseShape.holes.push(boltHole);
  }

  const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
    depth: 6,
    bevelEnabled: false,
    curveSegments: 40,
  });
  baseGeo.rotateX(Math.PI / 2);
  const baseMesh = new THREE.Mesh(baseGeo, material);
  baseMesh.position.set(0, -53, 0); // spans y = -53 down to -59, cleanly above laser (y = -65)
  group.add(baseMesh);

  return group;
}

/**
 * Exports any THREE.Object3D (Group or Mesh) into a valid binary STL Uint8Array.
 * Applies world transforms so all parts are baked accurately in millimeters.
 */
export function exportObjectToBinaryStl(root: THREE.Object3D, headerText = 'AT9-3 Parametric CAD'): Uint8Array {
  root.updateMatrixWorld(true);

  const triangles: Array<[THREE.Vector3, THREE.Vector3, THREE.Vector3]> = [];
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const pos = geo.getAttribute('position');
      if (!pos) return;

      const idx = geo.getIndex();
      const matrix = mesh.matrixWorld;

      if (idx) {
        for (let i = 0; i < idx.count; i += 3) {
          vA.fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(matrix);
          vB.fromBufferAttribute(pos, idx.getX(i + 1)).applyMatrix4(matrix);
          vC.fromBufferAttribute(pos, idx.getX(i + 2)).applyMatrix4(matrix);
          triangles.push([vA.clone(), vB.clone(), vC.clone()]);
        }
      } else {
        for (let i = 0; i < pos.count; i += 3) {
          vA.fromBufferAttribute(pos, i).applyMatrix4(matrix);
          vB.fromBufferAttribute(pos, i + 1).applyMatrix4(matrix);
          vC.fromBufferAttribute(pos, i + 2).applyMatrix4(matrix);
          triangles.push([vA.clone(), vB.clone(), vC.clone()]);
        }
      }
    }
  });

  const bufferLength = 84 + triangles.length * 50;
  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // 80-byte ASCII header
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < headerText.length ? headerText.charCodeAt(i) : 32);
  }
  view.setUint32(80, triangles.length, true);

  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  let offset = 84;

  for (const [a, b, c] of triangles) {
    cb.subVectors(c, b);
    ab.subVectors(a, b);
    cb.cross(ab).normalize();

    view.setFloat32(offset, cb.x, true);
    view.setFloat32(offset + 4, cb.y, true);
    view.setFloat32(offset + 8, cb.z, true);
    offset += 12;

    for (const v of [a, b, c]) {
      view.setFloat32(offset, v.x, true);
      view.setFloat32(offset + 4, v.y, true);
      view.setFloat32(offset + 8, v.z, true);
      offset += 12;
    }

    view.setUint16(offset, 0, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}
