const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey12345';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_placeholder';

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

router.post('/initialize', authenticate, async (req, res) => {
  const { amount, email } = req.body;
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { amount: amount * 100, email },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    
    await prisma.transaction.create({
      data: {
        userId: req.user.userId,
        amount,
        reference: response.data.data.reference,
        status: 'PENDING'
      }
    });

    res.json(response.data.data);
  } catch (error) {
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

router.get('/verify/:reference', authenticate, async (req, res) => {
  const { reference } = req.params;
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );

    const status = response.data.data.status === 'success' ? 'SUCCESS' : 'FAILED';
    
    await prisma.transaction.update({
      where: { reference },
      data: { status }
    });

    res.json({ status, message: 'Payment verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

module.exports = router;
