/**
 * Gera um slug amigável para URL a partir de uma string.
 * @param {string} text 
 * @returns {string}
 */
export const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-')     // Substitui caracteres não alfanuméricos por -
    .replace(/(^-|-$)+/g, '');       // Remove hífens no início e no fim
};

/**
 * Valida e formata um número de telefone para o padrão internacional (DDI+DDD+Número).
 * @param {string} phone 
 * @returns {string|null} Retorna o número formatado ou null se inválido.
 */
export const validateAndFormatPhone = (phone) => {
  if (!phone) return null;
  
  // Remover tudo que não for dígito
  let cleaned = phone.replace(/\D/g, '');
  
  // Se tiver 10 ou 11 dígitos, assumimos que é Brasil e falta o DDI (55)
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  // Um número internacional válido costuma ter entre 12 e 14 dígitos (DDI 55 + DDD 2 + 8/9 dígitos)
  if (cleaned.length >= 12 && cleaned.length <= 14) {
    return cleaned;
  }
  
  return null;
};

/**
 * Valida o algoritmo do CPF brasileiro.
 * @param {string} cpf 
 * @returns {boolean}
 */
export const validateCPF = (cpf) => {
  if (!cpf) return false;
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // CPFs com todos os dígitos iguais são inválidos
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
};

/**
 * Formata um CPF (000.000.000-00).
 * @param {string} cpf 
 * @returns {string}
 */
export const formatCPF = (cpf) => {
  if (!cpf) return '';
  const cleanCPF = cpf.replace(/\D/g, '').substring(0, 11);
  return cleanCPF
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

/**
 * Formata um telefone ((00) 00000-0000).
 * @param {string} phone 
 * @returns {string}
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '').substring(0, 11);
  if (cleanPhone.length <= 10) {
    return cleanPhone
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  } else {
    return cleanPhone
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }
};

/**
 * Valida se um CEP pertence à região de Viamão/RS (94400-000 a 94599-999).
 * @param {string} cep 
 * @returns {boolean}
 */
export const validateCEP = (cep) => {
  if (!cep) return false;
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) return false;
  const cepNum = parseInt(cleanCEP);
  // Viamão: 94400000 a 94599999
  return cepNum >= 94400000 && cepNum <= 94599999;
};

/**
 * Formata um CEP (00000-000).
 * @param {string} cep 
 * @returns {string}
 */
export const formatCEP = (cep) => {
  if (!cep) return '';
  const cleanCEP = cep.replace(/\D/g, '').substring(0, 8);
  return cleanCEP.replace(/(\d{5})(\d)/, '$1-$2');
};
/**
 * Capitaliza um título (ex: "cães e gatos" -> "Cães e Gatos").
 * Mantém preposições curtas em minúsculo conforme padrão PT-BR.
 * @param {string} text 
 * @returns {string}
 */
export const capitalizeTitle = (text) => {
  if (!text) return '';
  const preposicoes = ['e', 'de', 'da', 'do', 'das', 'dos', 'com', 'em'];
  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0 || !preposicoes.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
};
