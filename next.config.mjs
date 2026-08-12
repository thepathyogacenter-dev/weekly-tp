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
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
