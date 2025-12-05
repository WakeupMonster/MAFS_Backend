# Dating App Backend (Node.js + Express)

## Setup

1. Clone the repository
2. Copy `.env.example` → `.env`
3. Run:
   npm install
   npm start

## Scripts
npm run lint  
npm run test  
npm run build  

## Health Check
GET /health → { status: "ok" }


# Run Redis using Docker

# to verify docker in terminal after installing in desktop

docker --version
docker ps

# if we have .yml file then run below command.

docker compose up -d

# or

# If we do not have .yml file then we run directly below command.

docker run -d --name redis -p 6379:6379 redis

# check with 
docker ps (to check named redis running or not)

# Check Redis is working
docker exec -it redis redis-cli
ping

docker start redis

npm install
npm run dev
npm start
