FROM node:alpine

RUN apk --no-cache add imagemagick

COPY package.json package-lock.json /usr/src/app/
WORKDIR /usr/src/app
RUN npm install --production

COPY template /usr/src/app/template/
COPY src /usr/src/app/src/

VOLUME /usr/src/app/output

CMD npm start
