import { type VercelConfig, routes } from "@vercel/config/v1";

/**
 * A static Vite build: `npm run build` typechecks with `tsc -b` first, so a type
 * error fails the deployment rather than shipping.
 */
export const config: VercelConfig = {
	framework: "vite",
	buildCommand: "npm run build",
	outputDirectory: "dist",

	headers: [
		// Vite fingerprints everything it emits into /assets, so those files can
		// be cached forever.
		routes.cacheControl("/assets/(.*)", {
			public: true,
			maxAge: "1year",
			immutable: true,
		}),

		// The tile textures and the tile model are ~2.3 MB and stable, but their
		// filenames are not fingerprinted — cache them hard and let the CDN
		// revalidate in the background.
		routes.cacheControl("/textures/(.*)", {
			public: true,
			maxAge: "1day",
			staleWhileRevalidate: "1year",
		}),

		routes.header("/(.*)", [
			{ key: "X-Content-Type-Options", value: "nosniff" },
			{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
		]),
	],

	// One page, so any path serves the game. Real files still win over this
	// rewrite, which only runs when nothing matches on disk.
	rewrites: [routes.rewrite("/(.*)", "/index.html")],
};
