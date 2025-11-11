require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { initializeDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const clientRoutes = require('./routes/clientRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const exportRoutes = require('./routes/exportRoutes');
const finitionRoutes = require('./routes/finitionRoutes');
const atelierTaskRoutes = require('./routes/atelierTaskRoutes');
const supplierRoutes = require('./routes/suppliers');
const itemRoutes = require('./routes/itemRoutes');
const locationRoutes = require('./routes/locationRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
const server = createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow localhost and 127.0.0.1 with any port
      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }
      
      // Allow your local network (192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x)
      if (origin.match(/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/)) {
        return callback(null, true);
      }
      
      // Allow your specific ngrok URLs
      const allowedNgrokOrigins = [
        'https://6a76-105-102-7-60.ngrok-free.app',
        'https://0a61-105-102-7-60.ngrok-free.app'
      ];
      
      if (allowedNgrokOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// Make io available to other modules
app.set('io', io);

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);
  
  try {
    // Extract user info from auth handshake
    const { userId, username, role } = socket.handshake.auth;
    console.log('Socket handshake auth:', { userId, username, role });
    
    // Get cookies from the handshake headers
    const cookies = socket.handshake.headers.cookie;
    console.log('Socket cookies:', cookies);
    
    let token = null;
    
    if (cookies) {
      // Parse cookies to extract token
      const cookieArray = cookies.split(';');
      for (let cookie of cookieArray) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'token') {
          token = value;
          break;
        }
      }
    }
    
    console.log('Extracted token:', token ? 'exists' : 'missing');
    
    if (userId && username && role) {
      // For now, allow connection if we have basic user info
      // TODO: Add proper token validation later
      const roleRoom = `role-${role}`;
      const userRoom = `user-${userId}`;
      
      socket.join(roleRoom);
      socket.join(userRoom);
      socket.userId = userId;
      socket.userRole = role;
      socket.username = username;
      
      console.log(`🏠 Socket ${socket.id} authenticated as user ${username} (${userId}) with role ${role}`);
      console.log(`🚪 Joined rooms: ${roleRoom}, ${userRoom}`);
      
      // Send authentication success
      socket.emit('authenticated', { 
        success: true, 
        message: `Connected as ${username}`,
        rooms: [roleRoom, userRoom]
      });
    } else {
      console.log(`Socket ${socket.id} connected without proper user info`);
      // For now, allow anonymous connections for testing
      socket.emit('authenticated', { 
        success: false, 
        message: 'Connected without authentication' 
      });
    }
  } catch (error) {
    console.error('Socket authentication error:', error);
    socket.emit('authenticated', { 
      success: false, 
      message: 'Authentication error' 
    });
  }
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and 127.0.0.1 with any port
    if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow your local network (192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x)
    if (origin.match(/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow your specific ngrok URLs
    const allowedNgrokOrigins = [
      'https://6a76-105-102-7-60.ngrok-free.app',
      'https://0a61-105-102-7-60.ngrok-free.app'
    ];
    
    if (allowedNgrokOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));


// Health check endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Routes
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/finitions', finitionRoutes);
app.use('/api/atelier-tasks', atelierTaskRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/transactions', transactionRoutes);

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    const PORT = process.env.PORT || 3001;
    // Listen on all network interfaces (0.0.0.0) to allow access from other devices
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
      console.log(`Local access: http://localhost:${PORT}`);
      console.log(`Network access: http://[your-local-ip]:${PORT}`);
      console.log(`WebSocket server ready for connections`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
