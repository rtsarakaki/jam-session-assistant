import type { NextConfig } from "next";
import path from "node:path";

/** Repo root (parent of `frontend/`). Fixes Turbopack + serverless tracing when the clone is a monorepo. */
const monorepoRoot = path.resolve(process.cwd(), "..");
const isVercel = process.env.VERCEL === "1";
const appRoot = process.cwd();

const nextConfig: NextConfig = {
  /** Vercel / monorepo: trace files from repo root so lambdas do not miss chunks (symptom: 404 after a green build). */
  outputFileTracingRoot: isVercel ? monorepoRoot : undefined,
  /** Use monorepo root in Vercel, but keep local resolution in `frontend/`. */
  turbopack: { root: isVercel ? monorepoRoot : appRoot },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
