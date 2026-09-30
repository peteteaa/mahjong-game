import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { Table } from "./Table";

export const TABLE_BG = "#0a2620";

export function Scene() {
	return (
		<Canvas
			shadows
			dpr={[1, 2]}
			performance={{ min: 0.5 }}
			gl={{ antialias: true, powerPreference: "high-performance" }}
			className="h-full w-full"
		>
			<color attach="background" args={[TABLE_BG]} />
			<fog attach="fog" args={[TABLE_BG, 34, 62]} />

			<PerspectiveCamera
				makeDefault
				fov={40}
				near={0.1}
				far={200}
				position={[0, 22, 20.5]}
			/>
			<OrbitControls
				enableDamping
				dampingFactor={0.06}
				enablePan={false}
				minDistance={18}
				maxDistance={46}
				minPolarAngle={Math.PI / 8}
				maxPolarAngle={Math.PI / 2.35}
				target={[0, 0, 1.2]}
			/>

			<ambientLight intensity={0.55} />
			<hemisphereLight args={["#cfe9df", "#06120e", 0.5]} />
			<directionalLight
				position={[8, 22, 12]}
				intensity={1.1}
				castShadow
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
				shadow-camera-near={1}
				shadow-camera-far={60}
				shadow-camera-left={-18}
				shadow-camera-right={18}
				shadow-camera-top={18}
				shadow-camera-bottom={-18}
				shadow-bias={-0.0005}
			/>
			<directionalLight position={[-12, 14, -10]} intensity={0.35} />

			<Suspense fallback={null}>
				<Table />
			</Suspense>
		</Canvas>
	);
}
