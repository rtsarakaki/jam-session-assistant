import type { NextConfig } from "next";
import path from "node:path";

/** Repo root (parent of `frontend/`). Fixes Turbopack + serverless tracing when the clone is a monorepo. */
const monorepoRoot = path.resolve(process.cwd(), "..");

const nextConfig: NextConfig = {
  /** Vercel / monorepo: trace files from repo root so lambdas do not miss chunks (symptom: 404 after a green build). */
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
