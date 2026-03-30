const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bakers Meet API is running' });
});

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const paymentRoutes = require('./routes/payment');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/payment', paymentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
