FROM node:10

ENV NODE_ENV = 'production'

RUN mkdir /app
WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .

CMD npm start
