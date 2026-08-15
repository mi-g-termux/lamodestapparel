/**
 * Tolerant build wrapper.
 *
 * `tsc` writes JavaScript even when it reports type errors (noEmitOnError is
 * off), but it still exits non-zero — which makes `tsc && node dist/...` abort
 * even though the file it needs was just written successfully.
 *
 * For chores like `migrate` and `seed:admin` that is the wrong trade: a cosmetic
 * type complaint should not stop you creating your database tables. So this
 * wrapper runs the compiler, shows you everything it said, and then continues
 * as long as the entry point it was asked for actually exists.
 *
 * `npm run build` still uses plain `tsc`, so CI and your own typecheck stay
 * strict. This is only for the setup chores.
 *
 *   node scripts/build.mjs [required-output-file]
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// Call the compiler through Node directly rather than through a shell, so this
// behaves identically on Windows PowerShell, cmd.exe, macOS and Linux.
const tscBin = path.join(serverDir, "node_modules", "typescript", "bin", "tsc")

if (!existsSync(tscBin)) {
  console.error("\nTypeScript is not installed in server/node_modules.")
  console.error("Run this first, from the project root:\n")
  console.error("    npm run install:all\n")
  process.exit(1)
}

console.log("Compiling server (TypeScript)...")
const result = spawnSync(process.execPath, [tscBin, "-p", "tsconfig.json"], {
  cwd: serverDir,
  stdio: "inherit",
})

if (result.error) {
  console.error("\nCould not start the TypeScript compiler:", result.error.message)
  process.exit(1)
}

// The caller tells us which compiled file it is about to run.
const required = process.argv[2]
const target = required ? path.resolve(serverDir, required) : null

if (result.status !== 0) {
  if (target && existsSync(target)) {
    console.warn(
      "\nThe compiler reported type errors (listed above), but it still produced\n" +
        "the file needed for this step, so continuing.\n" +
        "Please fix those errors before deploying: npm run typecheck\n",
    )
  } else {
    console.error(
      "\nThe build failed and produced no usable output. Fix the errors above,\n" +
        "then try again.\n",
    )
    process.exit(result.status ?? 1)
  }
} else {
  console.log("Server compiled to server/dist.")
}

if (target && !existsSync(target)) {
  console.error(`\nExpected ${required} to exist after the build, but it does not.`)
  process.exit(1)
}
