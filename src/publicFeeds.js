const DEFAULT_FEED_DESCRIPTION = 'Create images, videos, audio, and more with ImgKit AI tools.';

function buildRobotsTxt(publicBaseUrl) {
  const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /member',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /forgot-password',
    'Disallow: /reset-password',
    'Disallow: /api/',
    `Sitemap: ${baseUrl}/sitemap.xml`
  ].join('\n');
}

function buildSitemapXml(publicBaseUrl, tools) {
  const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
  const publicPages = [
    { path: '/', updatedAt: '' },
    { path: '/pricing', updatedAt: '' },
    { path: '/privacy', updatedAt: '' },
    { path: '/terms', updatedAt: '' }
  ];
  const toolPages = normalizeTools(tools).map((tool) => ({
    path: `/tools/${encodeURIComponent(tool.slug)}`,
    updatedAt: tool.updatedAt
  }));
  const items = [...publicPages, ...toolPages].map((page) => {
    const lastmod = formatSitemapLastmod(page.updatedAt);
    return [
      '  <url>',
      `    <loc>${escapeXml(`${baseUrl}${page.path}`)}</loc>`,
      ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
      '  </url>'
    ].join('\n');
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...items,
    '</urlset>'
  ].join('\n');
}

function buildRssXml(publicBaseUrl, tools) {
  const baseUrl = normalizePublicBaseUrl(publicBaseUrl);
  const entries = normalizeTools(tools).map((tool) => buildRssItem(baseUrl, tool));
  const latestUpdate = normalizeTools(tools)
    .map((tool) => parseDate(tool.updatedAt))
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime())[0];
  const lastBuildDate = (latestUpdate || new Date()).toUTCString();

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    '  <channel>',
    '    <title>ImgKit AI Tools</title>',
    `    <link>${escapeXml(baseUrl)}</link>`,
    `    <description>${escapeXml(DEFAULT_FEED_DESCRIPTION)}</description>`,
    '    <language>en</language>',
    `    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    ...entries,
    '  </channel>',
    '</rss>'
  ].join('\n');
}

function buildRssItem(baseUrl, tool) {
  const link = `${baseUrl}/tools/${encodeURIComponent(tool.slug)}`;
  const title = String(tool.resolvedSeoTitle || tool.seoTitle || tool.name || 'AI Tool').trim();
  const description = String(
    tool.resolvedSeoDescription || tool.seoDescription || tool.shortDescription || DEFAULT_FEED_DESCRIPTION
  ).trim();
  const pubDate = formatRssDate(tool.updatedAt);

  return [
    '    <item>',
    `      <title>${escapeXml(title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <description>${escapeXml(description)}</description>`,
    ...(pubDate ? [`      <pubDate>${escapeXml(pubDate)}</pubDate>`] : []),
    '    </item>'
  ].join('\n');
}

function normalizeTools(tools) {
  return (Array.isArray(tools) ? tools : []).filter((tool) => (
    tool && typeof tool === 'object' && String(tool.slug || '').trim()
  ));
}

function normalizePublicBaseUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function formatSitemapLastmod(value) {
  const date = parseDate(value);
  return date ? date.toISOString() : '';
}

function formatRssDate(value) {
  const date = parseDate(value);
  return date ? date.toUTCString() : '';
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  buildRobotsTxt,
  buildRssXml,
  buildSitemapXml
};
