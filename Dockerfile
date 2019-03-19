FROM node:10

ENV NODE_ENV = 'production'

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i

COPY . .

EXPOSE 3000

CMD npm start
