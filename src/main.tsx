import { createRoot } from "react-dom/client";
import App from "./App";

// No StrictMode: the hand engine schedules real timers that should not run twice.
createRoot(document.getElementById("root") as HTMLElement).render(<App />);
