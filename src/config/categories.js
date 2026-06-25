/**
 * Mapeamento centralizado de identificadores de categorias para evitar inconsistências entre
 * o painel administrativo, as páginas de categoria e a filtragem de produtos.
 */
export const CATEGORY_IDS = {
  CACHORROS: 'cachorros',
  GATOS: 'gatos',
  PASSAROS: 'passaros',
  PEIXES: 'peixes',
  AGROPECUARIA: 'agropecuaria',
  BRINQUEDOS: 'brinquedos'
};

/**
 * Ícones visuais associados a cada categoria para uso em menus e navegação.
 */
export const CATEGORY_ICONS = {
  [CATEGORY_IDS.CACHORROS]: '🐶',
  [CATEGORY_IDS.GATOS]: '🐱',
  [CATEGORY_IDS.PASSAROS]: '🐦',
  [CATEGORY_IDS.PEIXES]: '🐟',
  [CATEGORY_IDS.AGROPECUARIA]: '🌾',
  [CATEGORY_IDS.BRINQUEDOS]: '🎾'
};

/**
 * Mapeamento de slugs de URL para IDs internos do sistema.
 */
export const CATEGORY_MAPPING = {
  'dogs': CATEGORY_IDS.CACHORROS,
  'cats': CATEGORY_IDS.GATOS,
  'birds': CATEGORY_IDS.PASSAROS,
  'fish': CATEGORY_IDS.PEIXES,
  'farm': CATEGORY_IDS.AGROPECUARIA,
  'toys': CATEGORY_IDS.BRINQUEDOS,
  'agro': CATEGORY_IDS.AGROPECUARIA // Adicionado conforme reportado pelo QA
};

/**
 * Nomes amigáveis para exibição de cada categoria.
 */
export const CATEGORY_NAMES = {
  [CATEGORY_IDS.CACHORROS]: 'Tudo para Cachorros',
  [CATEGORY_IDS.GATOS]: 'Tudo para Gatos',
  [CATEGORY_IDS.PASSAROS]: 'Tudo para Pássaros',
  [CATEGORY_IDS.PEIXES]: 'Tudo para Peixes',
  [CATEGORY_IDS.AGROPECUARIA]: 'Produtos Agropecuários',
  [CATEGORY_IDS.BRINQUEDOS]: 'Brinquedos',
  'roedores': 'Roedores & Pequenos Pets'
};
