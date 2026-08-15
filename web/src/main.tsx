import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import "./styles.css";

// Client entry for the single-page build. The Express server in ../server
// serves the compiled output of this file plus index.html, so the front end and
// the API live on one origin and one port. That is what keeps the admin session
// cookie and the CSRF header working.
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('index.html is missing <div id="root"></div>');
}

// A throw in here used to leave a blank white page. index.html installs a
// painter that writes the failure onto the page instead; use it if present.
try {
  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={getRouter()} />
    </StrictMode>,
  );
} catch (error) {
  const paint = (
    window as unknown as {
      __veloraPaintStartupError?: (title: string, detail: string) => void;
    }
  ).__veloraPaintStartupError;
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  if (paint) paint("The app failed to start", detail);
  throw error;
}
