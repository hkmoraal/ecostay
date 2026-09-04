FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
# API URL is needed at build time for the static bundle.
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "--port", "5173"]
