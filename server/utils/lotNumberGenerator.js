const { Lot } = require('../models');

/**
 * Generate a unique LOT number
 * Format: LOT-YYYYMMDD-XXX
 * Example: LOT-20241119-001
 */
async function generateLotNumber(itemId = null) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const datePrefix = `LOT-${year}${month}${day}`;
  
  // Find the highest number for today's date
  const existingLots = await Lot.findAll({
    where: {
      lot_number: {
        [require('sequelize').Op.like]: `${datePrefix}%`
      }
    },
    attributes: ['lot_number'],
    order: [['lot_number', 'DESC']],
    limit: 1
  });
  
  let counter = 1;
  
  if (existingLots.length > 0) {
    const lastLotNumber = existingLots[0].lot_number;
    const lastCounter = parseInt(lastLotNumber.split('-').pop());
    counter = lastCounter + 1;
  }
  
  const counterStr = String(counter).padStart(3, '0');
  const lotNumber = `${datePrefix}-${counterStr}`;
  
  return lotNumber;
}

/**
 * Generate a custom LOT number with item name
 * Format: LOT-ITEMNAME-YYYYMMDD-XXX
 * Example: LOT-PAPER-20241119-001
 */
async function generateCustomLotNumber(itemName) {
  // Sanitize item name (remove special chars, max 10 chars, uppercase)
  const sanitized = itemName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 10)
    .toUpperCase();
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const datePrefix = `LOT-${sanitized}-${year}${month}${day}`;
  
  // Find the highest number for this item and date
  const existingLots = await Lot.findAll({
    where: {
      lot_number: {
        [require('sequelize').Op.like]: `${datePrefix}%`
      }
    },
    attributes: ['lot_number'],
    order: [['lot_number', 'DESC']],
    limit: 1
  });
  
  let counter = 1;
  
  if (existingLots.length > 0) {
    const lastLotNumber = existingLots[0].lot_number;
    const lastCounter = parseInt(lastLotNumber.split('-').pop());
    counter = lastCounter + 1;
  }
  
  const counterStr = String(counter).padStart(3, '0');
  const lotNumber = `${datePrefix}-${counterStr}`;
  
  return lotNumber;
}

/**
 * Validate LOT number format
 */
function validateLotNumber(lotNumber) {
  // Basic format: LOT-YYYYMMDD-XXX
  const basicPattern = /^LOT-\d{8}-\d{3}$/;
  // Custom format: LOT-ITEMNAME-YYYYMMDD-XXX
  const customPattern = /^LOT-[A-Z0-9]{1,10}-\d{8}-\d{3}$/;
  
  return basicPattern.test(lotNumber) || customPattern.test(lotNumber);
}

module.exports = {
  generateLotNumber,
  generateCustomLotNumber,
  validateLotNumber
};
