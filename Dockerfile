FROM ruby:2.5-alpine AS build
RUN apk --no-cache add imagemagick
RUN gem install mustache mini_magick

WORKDIR /usr/src/app
COPY albums albums/
COPY build.rb .
COPY template template/
VOLUME /usr/src/app/.cache
RUN mkdir -p build && ruby build.rb
RUN chmod 644 /usr/src/app/build/albums/*/*

FROM nginx:mainline-alpine
RUN rm -rf /usr/share/nginx/html
COPY --from=build /usr/src/app/build /usr/share/nginx/html
