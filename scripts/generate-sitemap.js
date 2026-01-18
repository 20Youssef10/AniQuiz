import fs from 'fs';
import path from 'path';

// Change this to your actual production domain
const BASE_URL = 'https://aniquiz-ai.web.app';

const routes = [
  '',
  '/arcade',
  '/story',
  '/room_setup',
  '/leaderboard', // Conceptual route
];

const generateSitemap = () => {
  const currentDate = new Date().toISOString();
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(route => {
    return `
  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${route === '' ? '1.0' : '0.8'}</priority>
  </url>`;
  })
  .join('')}
</urlset>`;

  return sitemap;
};

const generateRobotsTxt = () => {
  return `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`;
};

const writeFiles = () => {
  // Ensure public directory exists
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  // Write sitemap.xml
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), generateSitemap());
  console.log('✅ Generated public/sitemap.xml');

  // Write robots.txt
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), generateRobotsTxt());
  console.log('✅ Generated public/robots.txt');
};

writeFiles();
