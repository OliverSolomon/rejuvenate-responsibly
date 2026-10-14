import type { NextConfig } from "next";

// The GitHub Actions staging deploy rsyncs `.next/standalone` to a server and
// runs it with node, so it needs standalone output. Vercel builds its own
// output and fails on the standalone trace (missing next-server.js.nft.json),
// so the option is left off there. Vercel sets VERCEL=1 during its builds.
const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
