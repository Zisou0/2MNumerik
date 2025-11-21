const QRCode = require('qrcode');

/**
 * Generate QR code as Data URL (base64 image)
 * @param {Object} lotData - LOT information to encode
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
async function generateQRCode(lotData) {
  try {
    const qrData = JSON.stringify({
      lot_number: lotData.lot_number,
      item_name: lotData.item_name || '',
      item_id: lotData.item_id || null,
      quantity: lotData.quantity || 0,
      expiration_date: lotData.expiration_date || null,
      received_date: lotData.received_date || null,
      supplier: lotData.supplier || null
    });
    
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as Buffer (for file download)
 * @param {Object} lotData - LOT information to encode
 * @returns {Promise<Buffer>} - QR code image buffer
 */
async function generateQRCodeBuffer(lotData) {
  try {
    const qrData = JSON.stringify({
      lot_number: lotData.lot_number,
      item_name: lotData.item_name || '',
      item_id: lotData.item_id || null,
      quantity: lotData.quantity || 0,
      expiration_date: lotData.expiration_date || null,
      received_date: lotData.received_date || null,
      supplier: lotData.supplier || null
    });
    
    const buffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 300,
      margin: 1
    });
    
    return buffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

/**
 * Generate simple QR code with just LOT number
 * @param {string} lotNumber - LOT number to encode
 * @returns {Promise<string>} - Base64 encoded QR code image
 */
async function generateSimpleQRCode(lotNumber) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(lotNumber, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 200,
      margin: 1
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating simple QR code:', error);
    throw new Error('Failed to generate simple QR code');
  }
}

/**
 * Decode QR code data (for scanning)
 * @param {string} qrData - QR code data string
 * @returns {Object|string} - Parsed LOT data or raw string
 */
function decodeQRData(qrData) {
  try {
    return JSON.parse(qrData);
  } catch (error) {
    // If not JSON, return as is (simple LOT number)
    return qrData;
  }
}

module.exports = {
  generateQRCode,
  generateQRCodeBuffer,
  generateSimpleQRCode,
  decodeQRData
};
