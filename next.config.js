/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'fastly.picsum.photos',
        // port: '', // Optional: if the hostname uses a non-standard port
        // pathname: '/account123/**', // Optional: if you want to restrict to a specific path
      },
      // Add other allowed hostnames here as needed
      // For Supabase storage, you'll need to add your Supabase project's hostname:
      // Example: <your-supabase-project-ref>.supabase.co
      {
        protocol: 'https',
        hostname: 'gowudtaeesnyvrxvpztk.supabase.co',
      },
    ],
  },
  // ... any other configurations you might have
};

module.exports = nextConfig; 