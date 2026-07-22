/** @type {import('next').NextConfig} */
const nextConfig = {
  // Widget ini dipakai di dalam iframe Webflow.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Ganti ke domain Webflow kamu kalau mau dikunci.
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
