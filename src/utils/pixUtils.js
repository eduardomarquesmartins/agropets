const PIX_GUI = 'br.gov.bcb.pix';
const PIX_COUNTRY_CODE = 'BR';
const PIX_CURRENCY_CODE = '986';
const DEFAULT_MERCHANT_CATEGORY = '0000';
const DEFAULT_TXID = '***';

const removeAccents = (value = '') =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const sanitizePixText = (value, maxLength) =>
  removeAccents(String(value || ''))
    .toUpperCase()
    .replace(/[^A-Z0-9 $%*+\-./:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const formatPixField = (id, value) => {
  const stringValue = String(value ?? '');
  return `${id}${stringValue.length.toString().padStart(2, '0')}${stringValue}`;
};

const crc16 = (value) => {
  let crc = 0xffff;

  for (let i = 0; i < value.length; i += 1) {
    crc ^= value.charCodeAt(i) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export const getPixMerchantCity = (address) => {
  const [city = 'VIAMAO'] = String(address || '').split(',');
  return sanitizePixText(city, 15) || 'VIAMAO';
};

export const buildPixCopyPaste = ({
  pixKey,
  amount,
  merchantName,
  merchantCity,
  txid = DEFAULT_TXID,
}) => {
  const cleanPixKey = String(pixKey || '').trim();
  const numericAmount = Number(amount);

  if (!cleanPixKey || !Number.isFinite(numericAmount) || numericAmount <= 0) {
    return '';
  }

  const accountInfo = [
    formatPixField('00', PIX_GUI),
    formatPixField('01', cleanPixKey),
  ].join('');

  const payload = [
    formatPixField('00', '01'),
    formatPixField('26', accountInfo),
    formatPixField('52', DEFAULT_MERCHANT_CATEGORY),
    formatPixField('53', PIX_CURRENCY_CODE),
    formatPixField('54', numericAmount.toFixed(2)),
    formatPixField('58', PIX_COUNTRY_CODE),
    formatPixField('59', sanitizePixText(merchantName, 25) || 'AGROPETS'),
    formatPixField('60', sanitizePixText(merchantCity, 15) || 'VIAMAO'),
    formatPixField('62', formatPixField('05', sanitizePixText(txid, 25) || DEFAULT_TXID)),
  ].join('');

  return `${payload}6304${crc16(`${payload}6304`)}`;
};
