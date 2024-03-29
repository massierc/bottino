FROM jrottenberg/ffmpeg:3.4-alpine AS ffmpeg
FROM node:10-alpine

COPY --from=ffmpeg / /

ENV FFMPEG_PATH = '/usr/local/bin/ffmpeg'
ENV NODE_ENV = 'production'

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i

COPY . .

EXPOSE 3000

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait

CMD /wait && npm start
