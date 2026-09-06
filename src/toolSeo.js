const DEFAULT_PAGE_DESCRIPTION = 'Create images, videos, audio, and more with ImgKit AI tools.';
const ENGLISH_SEO_PATTERN = /^[\x20-\x7e]+$/;

function createToolSeoMetadata(tool, publicBaseUrl) {
  const sourceTool = tool && typeof tool === 'object' ? tool : {};
  const normalizedBaseUrl = String(publicBaseUrl || '').replace(/\/+$/, '');
  const toolName = getEnglishSeoText(sourceTool.name) || 'AI Tool';
  const title = getEnglishSeoText(sourceTool.seoTitle) || `${toolName} - ImgKit`;
  const description = getEnglishSeoText(sourceTool.seoDescription)
    || getEnglishSeoText(sourceTool.shortDescription)
    || DEFAULT_PAGE_DESCRIPTION;
  const keywords = getEnglishSeoText(sourceTool.seoKeywords || sourceTool.seo_keywords);
  const canonicalUrl = `${normalizedBaseUrl}/tools/${encodeURIComponent(String(sourceTool.slug || '').trim())}`;

  return {
    title,
    description,
    keywords,
    canonicalUrl,
    imageUrl: resolvePublicUrl(sourceTool.previewImageUrl, normalizedBaseUrl)
  };
}

function createToolPageHtml(indexHtml, tool, publicBaseUrl) {
  const metadata = createToolSeoMetadata(tool, publicBaseUrl);
  const socialImageTags = metadata.imageUrl
    ? [
        `  <meta property="og:image" content="${escapeHtml(metadata.imageUrl)}">`,
        `  <meta name="twitter:image" content="${escapeHtml(metadata.imageUrl)}">`
      ]
    : [];
  const seoTags = [
    `  <meta name="description" content="${escapeHtml(metadata.description)}">`,
    metadata.keywords ? `  <meta name="keywords" content="${escapeHtml(metadata.keywords)}">` : '',
    `  <link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}">`,
    '  <meta property="og:type" content="website">',
    '  <meta property="og:site_name" content="ImgKit">',
    `  <meta property="og:title" content="${escapeHtml(metadata.title)}">`,
    `  <meta property="og:description" content="${escapeHtml(metadata.description)}">`,
    `  <meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}">`,
    ...socialImageTags,
    `  <meta name="twitter:card" content="${metadata.imageUrl ? 'summary_large_image' : 'summary'}">`,
    `  <meta name="twitter:title" content="${escapeHtml(metadata.title)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(metadata.description)}">`
  ].join('\n');

  return String(indexHtml || '')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`)
    .replace('</head>', `${seoTags}\n</head>`);
}

function getEnglishSeoText(value) {
  const normalizedValue = String(value || '').trim();
  if (!ENGLISH_SEO_PATTERN.test(normalizedValue)) return '';
  return normalizedValue;
}

function resolvePublicUrl(rawUrl, publicBaseUrl) {
  const value = String(rawUrl || '').trim();
  if (!value) return '';
  try {
    return new URL(value, `${publicBaseUrl}/`).href;
  } catch (error) {
    return '';
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  DEFAULT_PAGE_DESCRIPTION,
  createToolPageHtml,
  createToolSeoMetadata,
  getEnglishSeoText
};
