require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const knexConfig = require('./knexfile.js');
const knex = require('knex')(knexConfig.development);
const routes = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Basic console logger placeholder (replace with pino/winston in prod)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// simple rate limiter - production should use Redis-backed or better
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});
app.use(limiter);

// make db available in req
app.use((req, res, next) => {
  req.db = knex;
  next();
});

// routes
app.use('/api', routes);

// serve generated files (protected route serves through controllers)
app.use('/storage', express.static(__dirname + '/storage'));

app.get('/', (req, res) => res.json({ service: 'ValueCog API', version: '0.1.0' }));

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
});

module.exports = app;