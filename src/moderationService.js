/**
 * Content Moderation Service
 * Integrates with Creem Content Moderation API to screen prompt-based generation
 * for NSFW, sexually explicit, or otherwise prohibited content.
 *
 * @see https://docs.creem.io/features/moderation
 */

const CREEM_API_BASE_URL = process.env.CREEM_API_BASE_URL || 'https://api.creem.io/v1';
const CREEM_API_KEY = process.env.CREEM_API_KEY || '';

/**
 * Moderation result flags.
 */
const FLAG_NSFW = 'nsfw';
const FLAG_SEXUALLY_EXPLICIT = 'sexually_explicit';
const FLAG_HATE_SPEECH = 'hate_speech';
const FLAG_VIOLENCE = 'violence';
const FLAG_SELF_HARM = 'self_harm';

const BLOCKED_FLAGS = new Set([
  FLAG_NSFW,
  FLAG_SEXUALLY_EXPLICIT,
  FLAG_HATE_SPEECH,
  FLAG_VIOLENCE,
  FLAG_SELF_HARM
]);

/**
 * Extract all text prompts from the input values of a tool execution request.
 * Walks the input values object and collects every string value.
 *
 * @param {Object} inputValues - The raw input values submitted by the user.
 * @returns {string[]} Array of prompt strings to moderate.
 */
function extractPrompts(inputValues) {
  const prompts = [];

  function walk(obj) {
    if (typeof obj === 'string' && obj.trim().length > 0) {
      prompts.push(obj.trim());
    } else if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
    } else if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) walk(value);
    }
  }

  walk(inputValues);
  return prompts;
}

/**
 * Call the Creem Content Moderation API for a single text prompt.
 *
 * @param {string} text - The text to moderate.
 * @returns {Promise<Object>} Moderation result { flagged, flags, reason }.
 */
async function moderateText(text) {
  if (!CREEM_API_KEY) {
    // If no API key is configured, log a warning and allow the content.
    console.warn('[moderation] No CREEM_API_KEY configured – skipping moderation check');
    return { flagged: false, flags: [], reason: '' };
  }

  try {
    const response = await fetch(`${CREEM_API_BASE_URL}/moderation/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CREEM_API_KEY
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[moderation] API error ${response.status}: ${errorBody}`);
      // Fail open on API errors to avoid blocking legitimate requests.
      return { flagged: false, flags: [], reason: '' };
    }

    const data = await response.json();
    const flags = Array.isArray(data.flags) ? data.flags : [];
    const blockedFlags = flags.filter((f) => BLOCKED_FLAGS.has(f));

    return {
      flagged: blockedFlags.length > 0,
      flags,
      reason: blockedFlags.length > 0 ? `Content flagged: ${blockedFlags.join(', ')}` : ''
    };
  } catch (error) {
    console.error('[moderation] Request failed:', error.message);
    // Fail open on network errors.
    return { flagged: false, flags: [], reason: '' };
  }
}

/**
 * Moderate all prompts in a tool execution request.
 * Returns the first violation found, or null if all prompts are safe.
 *
 * @param {Object} inputValues - The raw input values submitted by the user.
 * @returns {Promise<Object|null>} Violation result { flagged, flags, reason } or null.
 */
async function moderateToolInput(inputValues) {
  if (!CREEM_API_KEY) {
    console.warn('[moderation] Skipping moderation – no API key configured');
    return null;
  }

  const prompts = extractPrompts(inputValues);
  if (prompts.length === 0) {
    return null;
  }

  for (const prompt of prompts) {
    // Skip very short prompts (e.g., single words, numbers).
    if (prompt.length < 3) continue;

    const result = await moderateText(prompt);
    if (result.flagged) {
      console.warn(`[moderation] BLOCKED prompt: "${prompt.substring(0, 100)}..." – ${result.reason}`);
      return result;
    }
  }

  return null;
}

/**
 * Create a moderation error response object for blocked content.
 *
 * @param {Object} violation - The moderation violation result.
 * @returns {Object} Error response { statusCode, body }.
 */
function createModerationError(violation) {
  return {
    statusCode: 422,
    body: {
      success: false,
      message: 'Content moderation failed: Your prompt contains prohibited content.',
      error: {
        code: 'CONTENT_MODERATION_BLOCKED',
        details: violation.reason || 'Prohibited content detected',
        flags: violation.flags || []
      }
    }
  };
}

module.exports = {
  moderateToolInput,
  createModerationError,
  extractPrompts
};
