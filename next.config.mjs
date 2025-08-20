/** @type {import('next').NextConfig} */
const nextConfig = {
    allowedDevOrigins: ['*.localhost', '*.cms.localhost'],
    output: "standalone",
};

export default nextConfig;
