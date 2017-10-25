FROM node:4-alpine

WORKDIR /root

COPY package.json npm-shrinkwrap.json ./

RUN apk update \
    && apk upgrade \
    && apk add bash \
    && npm install \
    && mv node_modules node_modules_cache \
    && rm -r package.json npm-shrinkwrap.json /tmp/*
