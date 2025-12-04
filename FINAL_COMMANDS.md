One-paragraph summary of exact commands to get running locally from a fresh machine:

# With Docker (recommended)
1. git clone <repo>
2. cp backend/.env.example backend/.env
3. cp frontend/.env.example frontend/.env
4. docker-compose up --build

# Without Docker (Node + Postgres)
1. git clone <repo>
2. Start Postgres and create DB
3. cd backend
4. cp .env.example .env (edit DATABASE_URL)
5. npm install
6. npx knex --knexfile knexfile.js migrate:latest
7. node scripts/seed_comps.js
8. npm run dev
9. cd ../frontend
10. npm install
11. npm run dev
