# --- Base Image ---
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json files
COPY package*.json ./

# Install deps
RUN npm install

# Copy the rest of the project
COPY . .

# Vite runs on 5173 internally
EXPOSE 5173

# Start Vite dev server, allowing external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
