# Velora Platform - Complete Fix Guide

## Issues Found & Fixed

### 1. **Node Modules Corruption (PRIMARY ISSUE)**
**Problem:** The `.bin` scripts in `node_modules` are looking for `node.exe` (Windows executable) instead of `node` (Linux executable).

**Location:** `web/node_modules/.bin/vite` and similar scripts

**Root Cause:** NPM installed Windows-style executables when it should install Unix-style ones.

**Fix:**
```bash
cd velora-platform
rm -rf server/node_modules web/node_modules
npm run install:all
```

### 2. **Build System Not Initialized**
**Problem:** Web application hasn't been built yet, so `/api/...` endpoints return 404 because `index.html` is missing.

**Location:** `web/dist/` (missing)

**Fix:**
```bash
npm run build:web
```

### 3. **Server Not Building**
**Problem:** TypeScript server hasn't been compiled to JavaScript.

**Location:** `server/dist/` (missing or out of date)

**Fix:**
```bash
npm run build:server
```

---

## Quick Start - Complete Recovery

### Option A: Automated Fix (Recommended)

Run this in PowerShell from your project root:

```powershell
# 1. Kill any running processes
taskkill /F /IM npm.exe
taskkill /F /IM node.exe

# 2. Clean everything
Remove-Item -Recurse -Force server\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force web\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force server\dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force web\dist -ErrorAction SilentlyContinue

# 3. Reinstall and build
npm run install:all
npm run build

# 4. Start the server
npm start
```

### Option B: Manual Fix (Step by Step)

```bash
# 1. Navigate to project
cd velora-platform

# 2. Clean old installations
rm -r server/node_modules web/node_modules server/dist web/dist

# 3. Install dependencies
npm --prefix server install
npm --prefix web install

# 4. Build everything
npm run build:server
npm run build:web

# 5. Start server
npm start
```

---

## What Each Build Step Does

### `npm run build:server`
- Compiles TypeScript in `server/src/` to JavaScript in `server/dist/`
- Creates the runnable backend that handles API requests
- Output: `server/dist/index.js` (the main entry point)

### `npm run build:web`
- Bundles React application from `web/src/` to `web/dist/`
- Creates optimized static files for the browser
- Output: `web/dist/index.html` (served to `/` and `/admin` routes)

### Why It Was Failing
When you visit `localhost:3000/admin`:
1. Browser requests `/admin`
2. Server looks for `/admin` in API routes → not found
3. Server tries to serve `web/dist/index.html` → **file doesn't exist** (build was never run)
4. Returns 500 error instead of the admin page

---

## Verification

After running the fix, verify everything works:

```bash
# Check server built successfully
ls -la server/dist/index.js

# Check web built successfully  
ls -la web/dist/index.html

# Start server (should say "Server ready on port 3000")
npm start

# Test endpoints
curl http://localhost:3000/api/health
# Should return: {"ok":true,"database":"...","node":"...","uptimeSeconds":...}

# Visit admin panel
# Open browser to: http://localhost:3000/admin
# Should show login page (not blank)
```

---

## Environment Variables Needed

Make sure your `.env` file in the project root has:

```
DATABASE_URL=postgresql://user:password@host:5432/velora
APP_SECRET=your-32-char-or-longer-secret-key
SITE_URL=http://localhost:3000
PORT=3000
```

---

## If Build Still Fails

### Error: "vite: not found" or "node.exe: not found"

**Cause:** NPM cached corrupted scripts

**Fix:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Error: "Module not found" or "Cannot find X"

**Cause:** Dependency not installed

**Fix:**
```bash
npm run install:all
```

### Error: "Database connection refused"

**Cause:** PostgreSQL not running or DATABASE_URL wrong

**Fix:**
1. Start PostgreSQL service
2. Check DATABASE_URL in `.env`
3. Run migrations: `npm run migrate`

---

## File Structure After Successful Build

```
velora-platform/
├── server/
│   ├── dist/              ✅ Contains compiled JavaScript
│   │   └── index.js       ✅ Main server file
│   ├── src/               📝 TypeScript source
│   └── package.json
├── web/
│   ├── dist/              ✅ Contains bundled React app
│   │   ├── index.html     ✅ Main HTML file
│   │   └── assets/        ✅ JS/CSS bundles
│   ├── src/               📝 React source
│   └── package.json
└── package.json
```

---

## Still Having Issues?

1. **Blank Page**: Web build didn't run → run `npm run build:web`
2. **Login not working**: Server build didn't run → run `npm run build:server`
3. **Cannot fetch data**: Database not connected → check `.env` and DATABASE_URL
4. **Port 3000 already in use**: Kill process on port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <pid> /F
   
   # Mac/Linux
   lsof -i :3000
   kill -9 <pid>
   ```

---

## Next Steps

Once the build completes successfully:

1. **Run migrations**: `npm run migrate`
2. **Create admin user**: `npm run seed:admin`
3. **Start development server**: `npm run dev` (with hot reload)
4. **Or start production**: `npm start`

