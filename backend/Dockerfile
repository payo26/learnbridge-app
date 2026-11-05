FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend ./backend
COPY database ./database
COPY shared ./shared
COPY src/subjects.json src/profiles.json ./src/
WORKDIR /app/backend
EXPOSE 3001
CMD ["npm", "start"]
