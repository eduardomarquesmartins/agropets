/**
 * Coordenadas fixas da AgropetsCão
 * Av. Senador Salgado Filho, 3631 - Viamópolis, Viamão - RS
 */
export const STORE_COORDS = {
  lat: -30.081702,
  lng: -51.087265
};

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine (linha reta)
 * @param {number} lat1 Latitude do ponto 1
 * @param {number} lon1 Longitude do ponto 1
 * @param {number} lat2 Latitude do ponto 2
 * @param {number} lon2 Longitude do ponto 2
 * @returns {number} Distância em quilômetros
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da Terra em KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Busca as coordenadas (lat/lon) de um CEP brasileiro via Nominatim (OpenStreetMap)
 * @param {string} cep O CEP a ser buscado
 * @returns {Promise<{lat: number, lon: number} | null>}
 */
export const getCoordsFromCep = async (cep) => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    // Usamos o Nominatim do OpenStreetMap (respeitando as políticas de uso)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${cleanCep}&country=brazil&format=json&limit=1`, {
      headers: {
        'User-Agent': 'AgropetsApp/1.0'
      }
    });
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar coordenadas do CEP:', error);
    return null;
  }
};

/**
 * Busca as coordenadas (lat/lon) de um endereço completo via Nominatim
 * @param {string} street Rua/Logradouro
 * @param {string} number Número da casa
 * @param {string} city Cidade
 * @param {string} cep CEP (opcional)
 * @returns {Promise<{lat: number, lon: number} | null>}
 */
export const getCoordsFromAddress = async (street, number, city = 'Viamão', cep = '') => {
  const query = `${street}, ${number}, ${city}, Brazil`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AgropetsApp/1.0'
      }
    });
    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    
    // Fallback: Tenta apenas com o CEP se o endereço completo falhar
    if (cep) {
      return await getCoordsFromCep(cep);
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar coordenadas do endereço:', error);
    if (cep) return await getCoordsFromCep(cep);
    return null;
  }
};
