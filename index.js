// Entry point for the backend server
// Sets up Express, connects to Supabase (PostgreSQL), and defines API routes

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Import authentication routes
const authRoutes = require('./auth');
app.use('/api/auth', authRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('Backend server is running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
