import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Generate random points in a sphere for the background effect
function generateRandomPoints(count: number, radius: number): Float32Array {
    const points = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(Math.random() * 2 - 1);
        const r = radius * Math.cbrt(Math.random());

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        points[i * 3] = x;
        points[i * 3 + 1] = y;
        points[i * 3 + 2] = z;
    }
    return points;
}

function ParticleField() {
    const ref = useRef<THREE.Points>(null);

    // Create static points once 
    const points = useRef(generateRandomPoints(1500, 2.5));

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.rotation.x -= delta / 20; // Very slow rotation
            ref.current.rotation.y -= delta / 30;
        }
    });

    return (
        <group rotation={[0, 0, Math.PI / 4]}>
            <Points ref={ref} positions={points.current} stride={3} frustumCulled={false}>
                <PointMaterial
                    transparent
                    color="#00F2EA" // Neon Cyan accent
                    size={0.008}
                    sizeAttenuation={true}
                    depthWrite={false}
                    opacity={0.4}
                />
            </Points>
        </group>
    );
}

export function CyberBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.6 }}>
            <Canvas camera={{ position: [0, 0, 1] }}>
                <ParticleField />
            </Canvas>
            {/* Fallback radial gradient to smooth out the transition to deep black */}
            <div className="absolute inset-0 z-10"
                style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 80%, rgba(0,0,0,1) 100%)' }} />
        </div>
    );
}
