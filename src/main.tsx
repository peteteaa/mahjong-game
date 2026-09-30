import { createRoot } from "react-dom/client";
import App from "./App";
import { useGameStore } from "./store/gameStore";

// No StrictMode: the hand engine schedules real timers that should not run twice.
createRoot(document.getElementById("root") as HTMLElement).render(<App />);

// A handle on the game for debugging from the console. `import.meta.env.DEV` is
// false in a production build, so this is dropped from the bundle.
if (import.meta.env.DEV) {
	(window as unknown as { game: typeof useGameStore }).game = useGameStore;
}
