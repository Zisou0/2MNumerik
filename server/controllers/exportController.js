const XLSX = require('xlsx');
const { Order, Product, OrderProduct, Client, User } = require('../models');

class ExportController {
  // Export all database tables to Excel
  static async exportDatabase(req, res) {
    try {
      // Check if user is admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false,
          message: 'Accès réservé aux administrateurs' 
        });
      }

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Export Users table
      const users = await User.findAll({
        attributes: { exclude: ['password'] }, // Don't export passwords
        raw: true
      });
      
      if (users.length > 0) {
        const usersWorksheet = XLSX.utils.json_to_sheet(users);
        XLSX.utils.book_append_sheet(workbook, usersWorksheet, 'Users');
      }

      // Export Clients table
      const clients = await Client.findAll({ raw: true });
      if (clients.length > 0) {
        const clientsWorksheet = XLSX.utils.json_to_sheet(clients);
        XLSX.utils.book_append_sheet(workbook, clientsWorksheet, 'Clients');
      }

      // Export Products table
      const products = await Product.findAll({ raw: true });
      if (products.length > 0) {
        const productsWorksheet = XLSX.utils.json_to_sheet(products);
        XLSX.utils.book_append_sheet(workbook, productsWorksheet, 'Products');
      }

      // Export Orders table
      const orders = await Order.findAll({ raw: true });
      if (orders.length > 0) {
        const ordersWorksheet = XLSX.utils.json_to_sheet(orders);
        XLSX.utils.book_append_sheet(workbook, ordersWorksheet, 'Orders');
      }

      // Export OrderProducts table (junction table)
      const orderProducts = await OrderProduct.findAll({ raw: true });
      if (orderProducts.length > 0) {
        const orderProductsWorksheet = XLSX.utils.json_to_sheet(orderProducts);
        XLSX.utils.book_append_sheet(workbook, orderProductsWorksheet, 'OrderProducts');
      }

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set headers for file download
      const filename = `database_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      // Send the buffer
      res.send(buffer);

    } catch (error) {
      console.error('Database export error:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'export de la base de données'
      });
    }
  }
}

module.exports = ExportController;
