const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey12345';

// Middleware to authenticate JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized' });
    req.user = decoded;
    next();
  });
};

// Create or update profile
router.post('/', authenticate, async (req, res) => {
  const { firstName, lastName, businessName, location, trainingNeeds, offerings, contactInfo } = req.body;
  try {
    const profile = await prisma.profile.upsert({
      where: { userId: req.user.userId },
      update: { firstName, lastName, businessName, location, trainingNeeds, offerings, contactInfo },
      create: { userId: req.user.userId, firstName, lastName, businessName, location, trainingNeeds, offerings, contactInfo },
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile
router.get('/', authenticate, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user.userId } });
    res.json(profile || {});
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search Bakers (for clients)
router.get('/bakers', async (req, res) => {
  const { location } = req.query;
  try {
    const bakers = await prisma.user.findMany({
      where: {
        role: { in: ['PRO_BAKER', 'INTENDING_BAKER'] },
        profile: location ? { location: { contains: location } } : undefined,
      },
      include: { profile: true },
    });
    res.json(bakers);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
