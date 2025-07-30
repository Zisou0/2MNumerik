# Sequelize Migrations Guide

This project now uses **Sequelize migrations** for database schema management. This provides version control for your database schema and allows for safe deployments.

## 🚀 **Quick Start**

### **Available Migration Commands:**

```bash
# Run all pending migrations
npm run migrate

# Undo the last migration
npm run migrate:undo

# Reset all migrations (undo all, then run all)
npm run migrate:reset

# Run all seeders
npm run seed
```

## 📋 **Migration Workflow**

### **1. Creating New Migrations**

```bash
# Generate a new migration file
npx sequelize-cli migration:generate --name your-migration-name

# Example: Add a new column
npx sequelize-cli migration:generate --name add-phone-to-users
```

### **2. Creating Seeders**

```bash
# Generate a new seeder file
npx sequelize-cli seed:generate --name your-seeder-name
```

### **3. Production Deployment**

```bash
# In production, always run migrations before starting the app
npm run migrate
npm start
```

## 📁 **File Structure**

```
server/
├── config/
│   ├── config.js          # Database configuration (uses .env)
│   └── database.js        # Sequelize connection wrapper
├── migrations/            # Migration files (version controlled)
├── models/               # Sequelize models
├── seeders/              # Seed data files
└── .sequelizerc          # Sequelize CLI configuration
```

## ⚙️ **Configuration**

The database configuration is in `config/config.js` and uses environment variables:

```javascript
{
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'mysql'
  }
}
```

## 🔄 **Migration vs Sync**

- **❌ Old way (sync)**: `sequelize.sync()` - Dangerous in production
- **✅ New way (migrations)**: Version-controlled schema changes

### **Benefits of Migrations:**

- 📋 **Version Control**: Track all database changes
- 🔒 **Safe Deployments**: No accidental data loss
- 🔄 **Rollback Support**: Undo changes if needed
- 👥 **Team Collaboration**: Share schema changes via Git
- 🚀 **Production Ready**: Industry standard approach

## 📝 **Example Migration**

```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "phone", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("users", "phone");
  },
};
```

## 🎯 **Current Schema**

### **Users Table**

- `id` (Primary Key, Auto Increment)
- `username` (String, Unique, Not Null)
- `email` (String, Unique, Not Null)
- `password` (String, Hashed, Not Null)
- `created_at` (Timestamp, Default: Current Time)

## 🛡️ **Best Practices**

1. **Always test migrations** in development first
2. **Backup database** before running migrations in production
3. **Never modify existing migrations** - create new ones instead
4. **Use transactions** for complex migrations
5. **Add indexes** for performance when needed

## 🚨 **Important Notes**

- The `sequelize.sync()` is now disabled in `database.js`
- All schema changes should be done via migrations
- Existing data is preserved when migrating from the old system
- Demo users are available after running seeders (admin@2mnumerik.com / password123)
