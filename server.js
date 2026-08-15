/**
 * cPanel / Passenger / VPS entry point.
 *
 * cPanel's "Setup Node.js App" screen asks for an Application startup file —
 * point it at this file. It simply loads the compiled server, which starts
 * listening on the port cPanel provides.
 *
 *   Application root:        velora-platform
 *   Application startup file: server.js
 *   Node version:            20 or newer
 */
import "./server/dist/index.js";
