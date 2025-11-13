#!/bin/bash

# Better Auth Setup Script for Lofitoapp
# This script helps you set up Better Auth quickly

echo "🚀 Better Auth Setup for Lofitoapp"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
echo -e "${BLUE}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Check if .env exists in server directory
echo -e "${BLUE}Checking environment variables...${NC}"
if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}⚠️  server/.env not found. Creating from .env.example...${NC}"
    cp server/.env.example server/.env
    echo -e "${GREEN}✅ Created server/.env${NC}"
    echo -e "${YELLOW}⚠️  Please edit server/.env and set your BETTER_AUTH_SECRET${NC}"
else
    echo -e "${GREEN}✅ server/.env exists${NC}"
fi
echo ""

# Check if .env exists in root directory
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Root .env not found. Creating...${NC}"
    echo "REACT_APP_API_URL=http://localhost:5000" > .env
    echo -e "${GREEN}✅ Created root .env${NC}"
else
    echo -e "${GREEN}✅ Root .env exists${NC}"
fi
echo ""

# Start Docker containers
echo -e "${BLUE}Starting Docker containers...${NC}"
docker-compose up -d
echo -e "${GREEN}✅ Docker containers started${NC}"
echo ""

# Wait for MySQL to be ready
echo -e "${BLUE}Waiting for MySQL to be ready...${NC}"
sleep 10

# Run database migration
echo -e "${BLUE}Running Better Auth database migration...${NC}"
docker-compose exec -T mysql mysql -u lofiuser -plofipass123 lofitoapp < server/database/better-auth-migration.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database migration completed${NC}"
else
    echo -e "${RED}❌ Database migration failed${NC}"
    echo -e "${YELLOW}You can run it manually:${NC}"
    echo "docker-compose exec mysql mysql -u lofiuser -plofipass123 lofitoapp < server/database/better-auth-migration.sql"
fi
echo ""

# Install backend dependencies
echo -e "${BLUE}Installing backend dependencies...${NC}"
cd server
npm install
cd ..
echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo ""

# Install frontend dependencies
echo -e "${BLUE}Installing frontend dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
echo ""

# Summary
echo ""
echo -e "${GREEN}🎉 Better Auth setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Edit server/.env and set a strong BETTER_AUTH_SECRET (min 32 characters)"
echo "2. (Optional) Add Google/GitHub OAuth credentials to server/.env"
echo "3. Start the backend: cd server && npm run dev"
echo "4. Start the frontend: npm start"
echo "5. Test authentication at http://localhost:3000"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "• View logs: docker-compose logs -f"
echo "• Stop containers: docker-compose down"
echo "• Access MySQL: docker-compose exec mysql mysql -u lofiuser -plofipass123 lofitoapp"
echo "• Access phpMyAdmin: http://localhost:8081"
echo ""
echo -e "${YELLOW}📚 Read BETTER_AUTH_SETUP.md for detailed documentation${NC}"
echo ""
