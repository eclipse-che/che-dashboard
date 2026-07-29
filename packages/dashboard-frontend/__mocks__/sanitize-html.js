/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

// CJS stub for sanitize-html (the package ships as ESM in newer versions).
// Implements minimal sanitization so tests that assert on sanitized output
// continue to pass without requiring the real ESM package.
function sanitizeHtml(html, options) {
  if (typeof html !== 'string') return '';
  const allowedTags = (options && options.allowedTags) || [];
  const allowedAttributes = (options && options.allowedAttributes) || {};

  // Strip tags that are not in allowedTags, keeping their text content.
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, function (match, tag, attrs) {
    const lowerTag = tag.toLowerCase();
    const isClosing = match.startsWith('</');

    if (!allowedTags.includes(lowerTag)) {
      return '';
    }

    if (isClosing) {
      return `</${lowerTag}>`;
    }

    // Filter attributes to only allowed ones
    const permittedAttrs = allowedAttributes[lowerTag] || [];
    let filteredAttrs = '';
    const attrRegex = /([a-zA-Z][a-zA-Z0-9-]*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let m;
    while ((m = attrRegex.exec(attrs)) !== null) {
      const attrName = m[1].toLowerCase();
      const attrValue = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
      if (permittedAttrs.includes(attrName)) {
        filteredAttrs += ` ${attrName}="${attrValue}"`;
      }
    }

    return `<${lowerTag}${filteredAttrs}>`;
  });
}

sanitizeHtml.defaults = { allowedTags: [], allowedAttributes: {} };
module.exports = sanitizeHtml;
