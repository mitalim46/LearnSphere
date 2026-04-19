require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/qa', require('./src/routes/qa'));
app.use('/api/upload', require('./src/routes/upload'));
app.use('/api/teacher', require('./src/routes/teacher'));
app.use('/api/verify', require('./src/routes/verify'));
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EduMind API is running' });
});
mongoose.connect(process.env.MONGO_URI, { family: 4 })
  .then(() => {
    console.log('MongoDB Atlas connected ✅');
    console.log('Connected to DB:', mongoose.connection.name);
  })
  .catch(err => {
    console.error('MongoDB error:', err.message); // Just print message, not full error
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));