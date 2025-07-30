# Server - MVC Architecture

This backend server follows the Model-View-Controller (MVC) pattern for better organization and maintainability.

## Project Structure

```
server/
├── index.js                    # Entry point and server configuration
├── config/
│   └── database.js             # Database connection and initialization
├── controllers/
│   ├── authController.js       # Authentication logic (login, register)
│   └── userController.js       # User management operations
├── models/
│   └── User.js                 # User data model and database operations
├── routes/
│   ├── authRoutes.js          # Authentication routes
│   └── userRoutes.js          # User management routes
├── middleware/
│   ├── auth.js                # Authentication and authorization middleware
│   └── validation.js          # Input validation middleware
└── utils/
    └── helpers.js             # Utility functions and helpers
```

## Architecture Overview

### Models

- **User.js**: Contains the User class with methods for database operations
  - `create()`: Create new user
  - `findByEmail()`: Find user by email
  - `findByUsername()`: Find user by username
  - `findById()`: Find user by ID
  - `verifyPassword()`: Verify user password

### Controllers

- **authController.js**: Handles authentication logic

  - `register()`: User registration
  - `login()`: User login
  - `getProfile()`: Get current user profile

- **userController.js**: Handles user management
  - `getAllUsers()`: Get all users (admin)
  - `getUserById()`: Get specific user
  - `updateProfile()`: Update user profile
  - `deleteAccount()`: Delete user account

### Routes

- **authRoutes.js**: Authentication endpoints

  - `POST /api/register`: User registration
  - `POST /api/login`: User login
  - `GET /api/profile`: Get user profile (protected)

- **userRoutes.js**: User management endpoints
  - `GET /api/users`: Get all users (protected)
  - `GET /api/users/:id`: Get user by ID (protected)
  - `PUT /api/users/profile`: Update profile (protected)
  - `DELETE /api/users/account`: Delete account (protected)

### Middleware

- **auth.js**: Authentication and authorization

  - `checkConnection()`: Verify database connection
  - `authenticateToken()`: Verify JWT token

- **validation.js**: Input validation
  - `validateRegistration()`: Validate registration data
  - `validateLogin()`: Validate login data

### Configuration

- **database.js**: Database setup and connection management
  - Handles MySQL connection
  - Creates database and tables if they don't exist
  - Provides connection getter

## API Endpoints

### Public Endpoints

- `GET /api` - Health check
- `POST /api/register` - User registration
- `POST /api/login` - User login

### Protected Endpoints (require authentication)

- `GET /api/profile` - Get current user profile
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/account` - Delete user account

## Environment Variables

Make sure to set up these environment variables in your `.env` file:

```
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

## Running the Server

```bash
npm run dev
```

## Security Features

### HTTP-Only Cookies

- JWT tokens are stored in HTTP-only cookies for maximum security
- Tokens are not accessible via JavaScript, preventing XSS attacks
- Cookies are configured with `sameSite: 'lax'` and `secure: true` in production
- Automatic token cleanup on logout

### CORS Configuration

- Configured to allow credentials from the frontend domain
- Restricts origin to the specific frontend URL in production

This new structure provides:

- Better separation of concerns
- Easier testing and maintenance
- Scalable architecture
- Clear organization of code
- Reusable components
