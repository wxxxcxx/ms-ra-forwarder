FROM node:latest

WORKDIR /app

COPY ./ ./
RUN npm install
RUN npm run build

ENV TOKEN= LOG_LEVEL=info PORT=3000

EXPOSE $PORT

CMD [ "node", "./dist/app.js" ]