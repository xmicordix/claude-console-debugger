# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install the dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose the port that the app runs on
EXPOSE 8081

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1

# Create a non-root user to run the application
RUN addgroup -g 1001 -S nodejs
RUN adduser -S claude -u 1001

# Change ownership of the app directory to the nodejs user
RUN chown -R claude:nodejs /app
USER claude

# Start the application
CMD ["npm", "start"]