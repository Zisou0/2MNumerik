const PDFDocument = require('pdfkit');

/**
 * Generate a PDF label for a lot with all relevant information
 * @param {Object} lotData - The lot data object
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generateLotPDF(lotData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text('LOT INFORMATION', 50, 50, { align: 'center' });

      doc.fontSize(16)
         .font('Helvetica')
         .text(`Generated: ${new Date().toLocaleString('fr-FR')}`, 50, 80, { align: 'center' });

      // Draw a line separator
      doc.moveTo(50, 110)
         .lineTo(550, 110)
         .stroke();

      let yPosition = 130;

      // Lot Number - Prominently displayed
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('LOT NUMBER:', 50, yPosition);
      
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor('red')
         .text(lotData.lot_number, 200, yPosition);

      yPosition += 50;
      doc.fillColor('black');

      // Item Information
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('ITEM INFORMATION', 50, yPosition);
      
      yPosition += 25;
      doc.fontSize(12)
         .font('Helvetica');

      if (lotData.item) {
        doc.text(`Item Name: ${lotData.item.name}`, 70, yPosition);
        yPosition += 20;
        
        if (lotData.item.description) {
          doc.text(`Description: ${lotData.item.description}`, 70, yPosition);
          yPosition += 20;
        }
      }

      yPosition += 10;

      // Lot Details
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('LOT DETAILS', 50, yPosition);
      
      yPosition += 25;
      doc.fontSize(12)
         .font('Helvetica');

      doc.text(`Initial Quantity: ${lotData.initial_quantity || 'N/A'}`, 70, yPosition);
      yPosition += 20;

      doc.text(`Status: ${lotData.status?.toUpperCase() || 'N/A'}`, 70, yPosition);
      yPosition += 20;

      if (lotData.manufacturing_date) {
        doc.text(`Manufacturing Date: ${new Date(lotData.manufacturing_date).toLocaleDateString('fr-FR')}`, 70, yPosition);
        yPosition += 20;
      }

      if (lotData.expiration_date) {
        doc.text(`Expiration Date: ${new Date(lotData.expiration_date).toLocaleDateString('fr-FR')}`, 70, yPosition);
        yPosition += 20;
      }

      if (lotData.received_date) {
        doc.text(`Received Date: ${new Date(lotData.received_date).toLocaleDateString('fr-FR')}`, 70, yPosition);
        yPosition += 20;
      }

      yPosition += 10;

      // Supplier Information
      if (lotData.supplier) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('SUPPLIER INFORMATION', 50, yPosition);
        
        yPosition += 25;
        doc.fontSize(12)
           .font('Helvetica');

        doc.text(`Supplier: ${lotData.supplier.nom}`, 70, yPosition);
        yPosition += 20;

        if (lotData.supplier.email) {
          doc.text(`Email: ${lotData.supplier.email}`, 70, yPosition);
          yPosition += 20;
        }

        if (lotData.supplier.telephone) {
          doc.text(`Phone: ${lotData.supplier.telephone}`, 70, yPosition);
          yPosition += 20;
        }

        yPosition += 10;
      }

      // Location Information
      if (lotData.locations && lotData.locations.length > 0) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('CURRENT LOCATIONS', 50, yPosition);
        
        yPosition += 25;
        doc.fontSize(12)
           .font('Helvetica');

        lotData.locations.forEach(location => {
          doc.text(`• ${location.name} (${location.type}): ${location.quantity} units`, 70, yPosition);
          yPosition += 20;
        });

        yPosition += 10;
      }

      // Notes
      if (lotData.notes) {
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('NOTES', 50, yPosition);
        
        yPosition += 25;
        doc.fontSize(12)
           .font('Helvetica');

        doc.text(lotData.notes, 70, yPosition, { width: 450, align: 'left' });
        yPosition += 40;
      }

      // Footer with lot number again
      doc.fontSize(10)
         .font('Helvetica')
         .text(`LOT: ${lotData.lot_number}`, 50, 750, { align: 'center' });

      // Draw a border around the entire document
      doc.rect(40, 40, 520, 720)
         .stroke();

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate a compact lot label (for small labels/stickers)
 * @param {Object} lotData - The lot data object
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generateLotLabel(lotData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [288, 432], // 4" x 6" label size
        margins: { top: 20, bottom: 20, left: 20, right: 20 }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Compact label design
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .text('LOT LABEL', 20, 20, { align: 'center' });

      // Lot number prominently
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('red')
         .text(lotData.lot_number, 20, 50, { align: 'center' });

      doc.fillColor('black');

      // Item name
      if (lotData.item) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(lotData.item.name, 20, 80, { align: 'center', width: 248 });
      }

      // Key information
      let yPos = 110;
      doc.fontSize(10)
         .font('Helvetica');

      if (lotData.expiration_date) {
        doc.text(`Exp: ${new Date(lotData.expiration_date).toLocaleDateString('fr-FR')}`, 20, yPos);
        yPos += 15;
      }

      if (lotData.initial_quantity) {
        doc.text(`Qty: ${lotData.initial_quantity}`, 20, yPos);
        yPos += 15;
      }

      doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, yPos);

      // Border
      doc.rect(10, 10, 268, 412)
         .stroke();

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateLotPDF,
  generateLotLabel
};