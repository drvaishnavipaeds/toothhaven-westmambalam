import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAppServiceWorker } from "./lib/register-sw";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Application root was not found");
createRoot(rootElement).render(<App />);
void registerAppServiceWorker();
