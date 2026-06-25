import DOMPurify from 'dompurify';

/**
 * Sanitização robusta de HTML para prevenir XSS.
 * Utiliza a biblioteca DOMPurify para remover tags e atributos perigosos.
 * @param {string} html 
 * @returns {string}
 */
export const sanitizeHTML = (html) => {
  if (!html) return '';
  
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'ul', 'li', 'br', 'span', 'table', 'tbody', 'tr', 'td', 'div', 'b', 'i'],
    ALLOWED_ATTR: ['style', 'class']
  });
};
