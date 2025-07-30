FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Start the app
CMD ["npm", "run", "dev"]
