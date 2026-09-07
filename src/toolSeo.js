const DEFAULT_PAGE_DESCRIPTION = 'Create images, videos, audio, and more with ImgKit AI tools.';
const ENGLISH_SEO_PATTERN = /^[\x20-\x7e]+$/;
const MAX_SEO_TITLE_LENGTH = 60;
const MAX_SEO_DESCRIPTION_LENGTH = 160;
const MAX_SEO_KEYWORDS_LENGTH = 255;

const TOOL_SEO_PROFILES = Object.freeze({
  'remove-background': {
    title: 'Remove Image Background Online - ImgKit',
    description: 'Remove image backgrounds online with AI and download clean transparent PNGs for products, portraits, and design projects.',
    keywords: 'remove background, background remover, transparent PNG, AI image editing',
    category: 'ImageEditingApplication'
  },
  'google-nano-banana-pro': {
    title: 'AI Image Generator & Editor - Nano Banana - ImgKit',
    description: 'Create polished banners, posters, and product visuals with Google Nano Banana AI image generation and image editing.',
    keywords: 'Nano Banana, AI image generator, AI image editor, product visuals',
    category: 'ImageEditingApplication'
  },
  'google-veo-3-1': {
    title: 'Veo 3.1 AI Video Generator - ImgKit',
    description: 'Generate cinematic videos from text, images, or reference frames with Google Veo 3.1.',
    keywords: 'Veo 3.1, AI video generator, text to video, image to video',
    category: 'VideoEditingApplication'
  },
  'kie-suno-music': {
    title: 'AI Music & Song Generator - Suno - ImgKit',
    description: 'Create original songs and background music with Suno AI, custom styles, lyrics, and instrumental controls.',
    keywords: 'Suno AI, AI music generator, AI song generator, background music',
    category: 'MusicApplication'
  },
  'kie-seedance-2-0': {
    title: 'Seedance 2.0 AI Video Generator - ImgKit',
    description: 'Generate realistic text-to-video and image-to-video clips with Seedance 2.0 and multimodal references.',
    keywords: 'Seedance 2.0, AI video generator, text to video, image to video',
    category: 'VideoEditingApplication'
  }
});

const CATEGORY_SEO_PROFILES = Object.freeze({
  image: {
    category: 'ImageEditingApplication',
    description: 'AI image editing and generation'
  },
  video: {
    category: 'VideoEditingApplication',
    description: 'AI video generation and editing'
  },
  audio: {
    category: 'MusicApplication',
    description: 'AI music and audio creation'
  },
  text: {
    category: 'WritingApplication',
    description: 'AI writing and text generation'
  }
});

function createToolSeoMetadata(tool, publicBaseUrl) {
  const sourceTool = tool && typeof tool === 'object' ? tool : {};
  const normalizedBaseUrl = String(publicBaseUrl || '').replace(/\/+$/, '');
  const slug = String(sourceTool.slug || '').trim().toLowerCase();
  const profile = TOOL_SEO_PROFILES[slug] || {};
  const categoryKey = String(sourceTool.categoryKey || sourceTool.categoryId || '').trim().toLowerCase();
  const categoryProfile = CATEGORY_SEO_PROFILES[categoryKey] || {};
  const toolName = getEnglishSeoText(sourceTool.name) || humanizeSlug(slug) || 'AI Tool';
  const configuredTitleValue = getEnglishSeoText(sourceTool.seoTitle || sourceTool.seo_title);
  const configuredDescriptionValue = getEnglishSeoText(sourceTool.seoDescription || sourceTool.seo_description);
  const configuredTitle = isGenericTitle(configuredTitleValue) ? '' : configuredTitleValue;
  const configuredDescription = isGenericDescription(configuredDescriptionValue)
    ? ''
    : configuredDescriptionValue;
  const configuredShortDescription = getEnglishSeoText(sourceTool.shortDescription || sourceTool.description);
  const configuredKeywords = getEnglishSeoText(sourceTool.seoKeywords || sourceTool.seo_keywords);
  const shortDescriptionFallback = configuredShortDescription === DEFAULT_PAGE_DESCRIPTION
    ? ''
    : configuredShortDescription;
  const title = limitSeoText(
    configuredTitle || profile.title || `${toolName} - ImgKit`,
    MAX_SEO_TITLE_LENGTH
  );
  const description = limitSeoText(
    configuredDescription
      || shortDescriptionFallback
      || profile.description
      || `Use ${toolName} online with ImgKit for ${categoryProfile.description || 'creative content creation'}.`,
    MAX_SEO_DESCRIPTION_LENGTH
  );
  const keywords = limitSeoText(
    configuredKeywords
      || profile.keywords
      || `${toolName}, AI tool, ${categoryProfile.description || 'online AI tool'}, ImgKit`,
    MAX_SEO_KEYWORDS_LENGTH
  );
  const canonicalUrl = slug
    ? `${normalizedBaseUrl}/tools/${encodeURIComponent(slug)}`
    : normalizedBaseUrl || '/';
  const category = profile.category || categoryProfile.category || 'MultimediaApplication';

  return {
    title,
    description,
    keywords,
    canonicalUrl,
    imageUrl: resolvePublicUrl(sourceTool.previewImageUrl, normalizedBaseUrl),
    category
  };
}

function createToolPageHtml(indexHtml, tool, publicBaseUrl) {
  const metadata = createToolSeoMetadata(tool, publicBaseUrl);
  const socialImageTags = metadata.imageUrl
    ? [
        `  <meta property="og:image" content="${escapeHtml(metadata.imageUrl)}">`,
        `  <meta property="og:image:alt" content="${escapeHtml(metadata.title)}">`,
        `  <meta name="twitter:image" content="${escapeHtml(metadata.imageUrl)}">`
      ]
    : [];
  const structuredData = createStructuredData(metadata);
  const seoTags = [
    `  <meta name="description" content="${escapeHtml(metadata.description)}">`,
    `  <meta name="keywords" content="${escapeHtml(metadata.keywords)}">`,
    `  <link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}">`,
    '  <meta property="og:type" content="website">',
    '  <meta property="og:site_name" content="ImgKit">',
    '  <meta property="og:locale" content="en_US">',
    `  <meta property="og:title" content="${escapeHtml(metadata.title)}">`,
    `  <meta property="og:description" content="${escapeHtml(metadata.description)}">`,
    `  <meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}">`,
    ...socialImageTags,
    `  <meta name="twitter:card" content="${metadata.imageUrl ? 'summary_large_image' : 'summary'}">`,
    `  <meta name="twitter:title" content="${escapeHtml(metadata.title)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(metadata.description)}">`,
    `  <script id="tool-structured-data" type="application/ld+json">${serializeJsonForHtml(structuredData)}</script>`
  ].join('\n');
  const fallbackContent = [
    '<noscript id="tool-seo-content">',
    '  <article>',
    `    <h1>${escapeHtml(metadata.title)}</h1>`,
    `    <p>${escapeHtml(metadata.description)}</p>`,
    '    <p>Explore this ImgKit AI tool and create high-quality content online.</p>',
    '  </article>',
    '</noscript>'
  ].join('\n');

  return String(indexHtml || '')
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/<\/head>/i, `${seoTags}\n</head>`)
    .replace(/<\/body>/i, `${fallbackContent}\n</body>`);
}

function createStructuredData(metadata) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: metadata.title,
    description: metadata.description,
    url: metadata.canonicalUrl,
    applicationCategory: metadata.category,
    operatingSystem: 'Web',
    publisher: {
      '@type': 'Organization',
      name: 'ImgKit',
      url: getOrigin(metadata.canonicalUrl)
    },
    ...(metadata.imageUrl ? { image: metadata.imageUrl } : {})
  };
}

function getEnglishSeoText(value) {
  const normalizedValue = String(value || '').trim();
  if (!ENGLISH_SEO_PATTERN.test(normalizedValue)) return '';
  return normalizedValue;
}

function humanizeSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function limitSeoText(value, maxLength) {
  const normalizedValue = String(value || '').trim();
  if (normalizedValue.length <= maxLength) return normalizedValue;
  const shortenedValue = normalizedValue.slice(0, maxLength - 1).replace(/\s+\S*$/, '').trim();
  return `${shortenedValue || normalizedValue.slice(0, maxLength - 1).trim()}...`;
}

function isGenericTitle(value) {
  return String(value || '').trim().toLowerCase() === 'ai tool - imgkit';
}

function isGenericDescription(value) {
  return String(value || '').trim() === DEFAULT_PAGE_DESCRIPTION;
}

function resolvePublicUrl(rawUrl, publicBaseUrl) {
  const value = String(rawUrl || '').trim();
  if (!value || !publicBaseUrl) return '';
  try {
    return new URL(value, `${publicBaseUrl}/`).href;
  } catch (error) {
    return '';
  }
}

function getOrigin(value) {
  try {
    return new URL(value).origin;
  } catch (error) {
    return '';
  }
}

function serializeJsonForHtml(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
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
