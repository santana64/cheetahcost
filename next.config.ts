import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: {
    // annotation mode: React Compiler only runs on components that explicitly
    // opt in with "use memo". Avoids Turbopack panics on large/complex pages.
    compilationMode: "annotation",
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
