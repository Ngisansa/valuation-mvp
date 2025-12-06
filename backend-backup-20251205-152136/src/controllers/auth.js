const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

module.exports = {
  signup: async (req, res) => {
    const knex = req.db;
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const existing = await knex('users').where({ email }).first();
    if (existing) return res.status(400).json({ error: 'email already in use' });

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [user] = await knex('users').insert({ email, password_hash }).returning(['id','email','role']);
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ user, token });
  },

  login: async (req, res) => {
    const knex = req.db;
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const user = await knex('users').where({ email }).first();
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
  }
};