# Frontend - React + Vite Application
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build application
ARG REACT_APP_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=$REACT_APP_API_URL

RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the production build
RUN npm install -g serve

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Run application
CMD ["serve", "-s", "dist", "-l", "3000"]
