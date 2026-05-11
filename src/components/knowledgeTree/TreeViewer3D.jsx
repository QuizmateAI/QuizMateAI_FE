import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// TreeViewer3D — 3D organic tree visualization.
//
// Visual mapping:
//   Document  -> trunk (vertical brown cylinder o center)
//   Branches  -> cylinders growing outward + upward tu trunk, distributed around
//   Leaves    -> small spheres at end of branches (or along), color by leaf_type
//
// Khong dung graph layout (dagre) — tinh toan position truc tiep theo logic cay
// that: branches phan bo xoay quanh trunk theo spiral, leaves cluster o ngon.
// ============================================================================

const LEAF_TYPE_COLOR = {
  DEFINITION: '#10b981',   // green
  RULE: '#3b82f6',          // blue
  FORMULA: '#ef4444',       // red
  EXAMPLE: '#f97316',       // orange
  PROCEDURE: '#a855f7',     // purple
  CONCEPT: '#06b6d4',       // cyan
  OTHER: '#94a3b8',         // gray
};

const TRUNK_HEIGHT = 10;
const TRUNK_RADIUS_BOTTOM = 0.5;
const TRUNK_RADIUS_TOP = 0.3;
const BRANCH_START_LOW = 0.35;     // 35% trunk - start of branching
const BRANCH_START_HIGH = 0.95;    // 95% trunk - top of canopy
const BRANCH_BASE_LENGTH = 2.5;
const BRANCH_LEAF_LENGTH = 0.18;   // moi leaf dai them (giam de canh ko qua dai)
const BRANCH_THICKNESS = 0.13;
const BRANCH_BEND = 0.4;            // do uon cong cua nhanh (organic look)
const LEAF_RADIUS = 0.16;
const LEAF_CLUSTER_RADIUS = 0.9;    // ban kinh cum la o ngon canh
const LEAF_DISABLED_OPACITY = 0.25;

// --------------------------------------------------------------------------
// Geometry helpers
// --------------------------------------------------------------------------
function cylinderTransform(start, end) {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(endVec, startVec);
  const length = direction.length();
  const midpoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  const up = new THREE.Vector3(0, 1, 0);
  const dir = direction.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
  return { midpoint: midpoint.toArray(), quaternion: quaternion.toArray(), length };
}

// --------------------------------------------------------------------------
// Trunk
// --------------------------------------------------------------------------
function Trunk() {
  return (
    <mesh position={[0, TRUNK_HEIGHT / 2, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[TRUNK_RADIUS_TOP, TRUNK_RADIUS_BOTTOM, TRUNK_HEIGHT, 12]} />
      <meshStandardMaterial color="#5d4037" roughness={0.9} />
    </mesh>
  );
}

// --------------------------------------------------------------------------
// Branch (organic curved tube — TubeGeometry along Catmull-Rom curve)
// --------------------------------------------------------------------------
function Branch({ branch, onSelect, isSelected }) {
  const { start, end, thickness, isEnabled, _bendOffset } = branch;

  const geometry = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    // Mid point voi bend offset — canh cong len tu nhien (chong gravity)
    const mid = new THREE.Vector3().lerpVectors(startVec, endVec, 0.5);
    mid.y += BRANCH_BEND * (_bendOffset ?? 1);  // bend upward
    // 1/3 va 2/3 cho curve muot hon
    const q1 = new THREE.Vector3().lerpVectors(startVec, mid, 0.5);
    const q3 = new THREE.Vector3().lerpVectors(mid, endVec, 0.5);
    const curve = new THREE.CatmullRomCurve3([startVec, q1, mid, q3, endVec]);
    return new THREE.TubeGeometry(curve, 16, thickness, 8, false);
  }, [start, end, thickness, _bendOffset]);

  const color = isSelected ? '#d97706' : '#5d3f2f';
  return (
    <mesh
      geometry={geometry}
      onClick={(e) => { e.stopPropagation(); onSelect?.(branch); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      castShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.85}
        transparent={!isEnabled}
        opacity={isEnabled ? 1 : 0.35}
      />
    </mesh>
  );
}

// --------------------------------------------------------------------------
// Leaf (sphere at branch position)
// --------------------------------------------------------------------------
function Leaf({ leaf, onSelect, isSelected }) {
  const meshRef = useRef();
  const color = LEAF_TYPE_COLOR[leaf.leafType] || LEAF_TYPE_COLOR.OTHER;
  // Sway animation: nhe nhe theo time
  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      const sway = Math.sin(t * 0.6 + leaf.nodeId * 0.3) * 0.04;
      meshRef.current.position.x = leaf._basePos[0] + sway;
      meshRef.current.position.z = leaf._basePos[2] + sway * 0.5;
    }
  });

  const scale = isSelected ? 1.6 : 1;

  return (
    <mesh
      ref={meshRef}
      position={leaf._basePos}
      scale={scale}
      onClick={(e) => { e.stopPropagation(); onSelect?.(leaf); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <sphereGeometry args={[LEAF_RADIUS, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? 0.4 : 0}
        transparent={!leaf.isEnabled}
        opacity={leaf.isEnabled ? 1 : LEAF_DISABLED_OPACITY}
        roughness={0.5}
      />
    </mesh>
  );
}

// --------------------------------------------------------------------------
// Layout: compute branch + leaf positions from flat nodes[]
// --------------------------------------------------------------------------
function computeTreeGeometry(nodes) {
  const branches = nodes.filter((n) => n.nodeType === 'BRANCH');
  const leaves = nodes.filter((n) => n.nodeType === 'LEAF');

  // Group leaves by parentNodeId
  const leavesByParent = new Map();
  for (const leaf of leaves) {
    const pid = leaf.parentNodeId;
    if (pid == null) continue;
    if (!leavesByParent.has(pid)) leavesByParent.set(pid, []);
    leavesByParent.get(pid).push(leaf);
  }

  const total = branches.length;
  const computedBranches = branches.map((branch, i) => {
    // Pseudo-random seeded by nodeId cho consistency giua renders
    const seed = (branch.nodeId * 9301 + 49297) % 233280;
    const rand = (n) => ((seed * (n + 1)) % 233280) / 233280;

    const t = total > 1 ? i / (total - 1) : 0.5;
    const angle = i * 2.39996;  // golden angle phyllotaxis
    // Spread starts theo trunk height: 35%-95%, voi jitter
    const heightOnTrunk = BRANCH_START_LOW + (BRANCH_START_HIGH - BRANCH_START_LOW) * t + (rand(1) - 0.5) * 0.05;
    const y0 = heightOnTrunk * TRUNK_HEIGHT;
    const surfaceR = TRUNK_RADIUS_BOTTOM * (1 - heightOnTrunk * 0.4);
    const start = [
      surfaceR * Math.cos(angle),
      y0,
      surfaceR * Math.sin(angle),
    ];

    const leafCount = (leavesByParent.get(branch.nodeId) || []).length;
    // Length variation: ±25% random
    const lengthVariation = 0.75 + rand(2) * 0.5;
    const branchLength = (BRANCH_BASE_LENGTH + leafCount * BRANCH_LEAF_LENGTH) * lengthVariation;

    // Tilt: canh duoi ngang hon, canh tren cao vot len (tren = nhieu vot up,
    // duoi = trai dai ra ngoai). Khac voi version cu — fix direction.
    // tilt = 0 = horizontal, PI/2 = vertical
    const baseTilt = Math.PI / 5 + t * Math.PI / 3;  // 36deg to 96deg (giua-ngang den thang dung)
    const tilt = baseTilt + (rand(3) - 0.5) * 0.25;  // ±7deg jitter
    const horizontalR = Math.cos(tilt);
    const verticalR = Math.sin(tilt);
    const end = [
      start[0] + branchLength * horizontalR * Math.cos(angle),
      start[1] + branchLength * verticalR,
      start[2] + branchLength * horizontalR * Math.sin(angle),
    ];

    return {
      ...branch,
      start,
      end,
      thickness: BRANCH_THICKNESS * (0.85 + leafCount * 0.015),
      _angle: angle,
      _length: branchLength,
      _bendOffset: 0.7 + rand(4) * 0.6,  // 0.7-1.3 — uon nhieu it khac nhau
    };
  });

  // Compute leaf positions: cluster bong tron quanh ngon canh (Fibonacci sphere)
  const computedLeaves = [];
  for (const branch of computedBranches) {
    const branchLeaves = leavesByParent.get(branch.nodeId) || [];
    const endVec = new THREE.Vector3(...branch.end);
    const startVec = new THREE.Vector3(...branch.start);
    const branchDir = new THREE.Vector3().subVectors(endVec, startVec).normalize();

    branchLeaves.forEach((leaf, idx) => {
      const n = branchLeaves.length;
      // 70% leaves clusters tai ngon, 30% rai doc canh
      const clusterAtTip = idx >= Math.floor(n * 0.3);

      let basePos;
      if (clusterAtTip) {
        const cIdx = idx - Math.floor(n * 0.3);
        const cTotal = Math.max(1, n - Math.floor(n * 0.3));
        // Fibonacci sphere — phan bo deu tren mat cau
        const phi = Math.acos(1 - 2 * (cIdx + 0.5) / cTotal);
        const theta = Math.PI * (1 + Math.sqrt(5)) * cIdx;
        const r = LEAF_CLUSTER_RADIUS * (0.6 + 0.4 * ((idx * 7) % 10) / 10);
        const sphX = r * Math.sin(phi) * Math.cos(theta);
        const sphY = r * Math.sin(phi) * Math.sin(theta);
        const sphZ = r * Math.cos(phi);
        basePos = [
          endVec.x + sphX,
          endVec.y + Math.abs(sphY) * 0.8,  // bias upward (la tu nhien hut ve ngon canh)
          endVec.z + sphZ,
        ];
      } else {
        // Rai doc nua sau cua canh — nhung leaf gan goc cua canh
        const tAlong = 0.55 + 0.4 * (idx / Math.max(1, Math.floor(n * 0.3)));
        const along = new THREE.Vector3().lerpVectors(startVec, endVec, tAlong);
        const jitterAngle = (idx * 2.39996) % (Math.PI * 2);
        const jitterR = 0.3;
        basePos = [
          along.x + jitterR * Math.cos(jitterAngle),
          along.y + jitterR * 0.3 * Math.sin(jitterAngle * 2),
          along.z + jitterR * Math.sin(jitterAngle),
        ];
      }
      computedLeaves.push({ ...leaf, _basePos: basePos, _parentBranch: branch });
    });
  }

  return { computedBranches, computedLeaves };
}

// --------------------------------------------------------------------------
// Main scene
// --------------------------------------------------------------------------
function TreeScene({ nodes, selectedNodeId, onNodeClick }) {
  const { computedBranches, computedLeaves } = useMemo(
    () => computeTreeGeometry(nodes || []),
    [nodes]
  );

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-10, 8, -5]} intensity={0.3} />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[20, 32]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.95} />
      </mesh>

      <Trunk />

      {computedBranches.map((branch) => (
        <Branch
          key={`b-${branch.nodeId}`}
          branch={branch}
          onSelect={onNodeClick}
          isSelected={selectedNodeId === branch.nodeId}
        />
      ))}

      {computedLeaves.map((leaf) => (
        <Leaf
          key={`l-${leaf.nodeId}`}
          leaf={leaf}
          onSelect={onNodeClick}
          isSelected={selectedNodeId === leaf.nodeId}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={50}
        target={[0, TRUNK_HEIGHT / 2, 0]}
      />
    </>
  );
}

// --------------------------------------------------------------------------
// Public component
// --------------------------------------------------------------------------
export default function TreeViewer3D({ nodes, onNodeClick }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Chưa có cây kiến thức.
      </div>
    );
  }

  const handleClick = (node) => {
    setSelectedNodeId(node.nodeId);
    onNodeClick?.(node);
  };

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500, background: 'linear-gradient(180deg, #f0f9ff 0%, #ecfeff 50%, #f5f5f4 100%)' }}>
      <Canvas
        camera={{ position: [12, 8, 12], fov: 50 }}
        shadows
        dpr={[1, 2]}
      >
        <TreeScene
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onNodeClick={handleClick}
        />
      </Canvas>

      {/* Legend overlay */}
      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: 8, fontSize: 11, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: '#475569' }}>Loại lá:</div>
        {Object.entries(LEAF_TYPE_COLOR).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ color: '#475569' }}>{type}</span>
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.9)', padding: '6px 10px', borderRadius: 6, fontSize: 11, color: '#475569', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        🖱️ Kéo để xoay · Scroll để zoom · Click lá/cành để xem chi tiết
      </div>
    </div>
  );
}
