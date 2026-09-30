import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { memo, useRef, useState } from "react";
import * as THREE from "three";
import { TILE, type TileAssets } from "./tileAssets";

export interface Tile3DProps {
	assets: TileAssets;
	/** Texture basename; omit for a face-down tile. */
	texture?: string;
	position: [number, number, number];
	/** Yaw in radians; the tile faces +Z in its own frame before this rotation. */
	yaw?: number;
	/** Standing tiles face the camera, flat tiles lie face-up on the table. */
	standing?: boolean;
	selectable?: boolean;
	dimmed?: boolean;
	highlight?: boolean;
	onSelect?: () => void;
}

const UP = new THREE.Vector3();

export const Tile3D = memo(function Tile3D({
	assets,
	texture,
	position,
	yaw = 0,
	standing = false,
	selectable = false,
	dimmed = false,
	highlight = false,
	onSelect,
}: Tile3DProps) {
	const group = useRef<THREE.Group>(null);
	const [hovered, setHovered] = useState(false);
	const lift = useRef(0);
	const spawn = useRef(0);

	useFrame((_, delta) => {
		if (!group.current) return;
		const target = selectable && hovered ? 1 : 0;
		lift.current = THREE.MathUtils.damp(lift.current, target, 12, delta);
		spawn.current = THREE.MathUtils.damp(spawn.current, 1, 14, delta);

		UP.set(position[0], position[1], position[2]);
		if (standing) UP.z -= lift.current * 0.35;
		UP.y += lift.current * 0.28 + (1 - spawn.current) * 1.4;
		group.current.position.copy(UP);
		group.current.scale.setScalar(0.85 + spawn.current * 0.15);
	});

	const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
		if (!selectable) return;
		event.stopPropagation();
		setHovered(true);
		document.body.style.cursor = "pointer";
	};

	const handlePointerOut = () => {
		if (!selectable) return;
		setHovered(false);
		document.body.style.cursor = "auto";
	};

	const handleClick = (event: ThreeEvent<MouseEvent>) => {
		if (!selectable || !onSelect) return;
		event.stopPropagation();
		onSelect();
	};

	const faceMaterial = texture
		? (assets.faceMaterials.get(texture) ?? assets.blankFaceMaterial)
		: assets.blankFaceMaterial;

	return (
		<group
			ref={group}
			position={position}
			rotation={[standing ? Math.PI / 2 : 0, yaw, 0]}
			onPointerOver={handlePointerOver}
			onPointerOut={handlePointerOut}
			onClick={handleClick}
		>
			{/* Reproduces the tile model's own orientation and scale. */}
			<group rotation={[0, Math.PI, 0]}>
				<group scale={TILE.scale}>
					<mesh
						castShadow
						receiveShadow
						geometry={assets.sides}
						material={texture ? assets.sideMaterial : assets.backMaterial}
					/>
					<mesh
						castShadow
						receiveShadow
						geometry={assets.face}
						material={faceMaterial}
					/>
				</group>
			</group>
			{(highlight || (hovered && selectable)) && (
				<mesh position={[0, 0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<planeGeometry args={[TILE.width * 1.15, TILE.height * 1.05]} />
					<meshBasicMaterial
						color={highlight ? "#ffd166" : "#8ee6c8"}
						transparent
						opacity={highlight ? 0.45 : 0.25}
						depthWrite={false}
					/>
				</mesh>
			)}
			{dimmed && (
				<mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<planeGeometry args={[TILE.width, TILE.height]} />
					<meshBasicMaterial
						color="#0b1f18"
						transparent
						opacity={0.35}
						depthWrite={false}
					/>
				</mesh>
			)}
		</group>
	);
});
