import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { ALL_TEXTURE_NAMES } from "@/game/tiles";

export const TILE_MODEL = "/textures/models/tile.glb";

/** Tile dimensions once the model scale below is applied. */
export const TILE = {
	width: 1.1,
	height: 1.6,
	thickness: 0.52,
	/** Scale that turns the raw model into the dimensions above. */
	scale: [-0.35, 1, 0.8] as [number, number, number],
};

/**
 * The white dragon ships as a completely blank tile in this set, which reads as
 * a missing texture. Draw it the traditional way instead: an empty field inside
 * a blue frame.
 */
function whiteDragonTexture(): THREE.Texture {
	const canvas = document.createElement("canvas");
	canvas.width = 600;
	canvas.height = 800;
	const ctx = canvas.getContext("2d");
	if (!ctx) return new THREE.Texture();

	const frame = (inset: number, width: number, radius: number) => {
		ctx.lineWidth = width;
		ctx.beginPath();
		ctx.roundRect(
			inset,
			inset,
			canvas.width - inset * 2,
			canvas.height - inset * 2,
			radius,
		);
		ctx.stroke();
	};

	ctx.strokeStyle = "#1c4f8f";
	frame(96, 26, 26);
	ctx.strokeStyle = "#2f6fbd";
	frame(140, 10, 18);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;
	return texture;
}

export interface TileAssets {
	sides: THREE.BufferGeometry;
	face: THREE.BufferGeometry;
	textures: Map<string, THREE.Texture>;
	faceMaterials: Map<string, THREE.Material>;
	backMaterial: THREE.Material;
	sideMaterial: THREE.Material;
	blankFaceMaterial: THREE.Material;
}

export function useTileAssets(): TileAssets {
	const { nodes } = useGLTF(TILE_MODEL);
	const paths = useMemo(
		() => ALL_TEXTURE_NAMES.map((name) => `/textures/Regular/${name}.png`),
		[],
	);
	// Configured on load: the tile art is authored in sRGB.
	const loaded = useTexture(paths, (result) => {
		for (const texture of Array.isArray(result) ? result : [result]) {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.anisotropy = 4;
		}
	});

	return useMemo(() => {
		const textures = new Map<string, THREE.Texture>();
		const faceMaterials = new Map<string, THREE.Material>();
		const whiteDragon = whiteDragonTexture();
		ALL_TEXTURE_NAMES.forEach((name, index) => {
			const texture = name === "Haku" ? whiteDragon : loaded[index];
			textures.set(name, texture);
			faceMaterials.set(
				name,
				new THREE.MeshStandardMaterial({
					map: texture,
					transparent: true,
					alphaTest: 0.1,
					roughness: 0.55,
					side: THREE.DoubleSide,
				}),
			);
		});

		return {
			sides: (nodes.Cube as THREE.Mesh).geometry,
			face: (nodes.Cube001 as THREE.Mesh).geometry,
			textures,
			faceMaterials,
			// Ivory front, jade-green back — the classic tile look.
			sideMaterial: new THREE.MeshStandardMaterial({
				color: "#f6f1e3",
				roughness: 0.45,
				metalness: 0.02,
			}),
			backMaterial: new THREE.MeshStandardMaterial({
				color: "#1f7a57",
				roughness: 0.6,
			}),
			blankFaceMaterial: new THREE.MeshStandardMaterial({
				color: "#1f7a57",
				roughness: 0.6,
			}),
		};
	}, [nodes, loaded]);
}

useGLTF.preload(TILE_MODEL);
