FROM node:slim

WORKDIR /app

COPY ./package*.json ./
RUN npm install
COPY ./ ./
RUN npm run build

ENV TOKEN= PORT=3000

EXPOSE $PORT

CMD [ "node", "./dist/app.js" ]