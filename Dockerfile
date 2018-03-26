FROM node:alpine

RUN apk --no-cache add imagemagick

COPY package.json package-lock.json /usr/src/app/
WORKDIR /usr/src/app
RUN npm install --production

COPY src /usr/src/app/src/
COPY template /usr/src/app/template/

VOLUME /usr/src/app/output

CMD npm start
