const express = require('express');
const calc = require('./calculator.js');
var numeral = require('numeral');
var path = require('path');

const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();

const USE_CACHE = process.env.USE_CACHE;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

function createCache() {
  if (USE_CACHE) {
    var client = require('redis').createClient(
      REDIS_PORT,
      REDIS_HOST,
      {
        connect_timeout: 500,
      });

    client.on('error', function (err) {
      throw err;
    });

    var cache = require('express-redis-cache')({
      client: client,
      expire: 60
    });

    cache.on('message', function(message){
      console.log("cache", message);
    });

    cache.on('error', function(error){
      console.error("cache", error);
    });

    return cache;
  } else {
    return null;
  }
}
const cache = createCache();

function cacheRoute() {
  if (cache) {
    return cache.route();
  } else {
    // no-op
    return function(req, res, next) {
      next();
    }
  }
}

function parseA(req) {
  return numeral(req.query.a).value();
}

function parseB(req) {
  return numeral(req.query.b).value();
}

function sendResult(value, res) {
  const formattedValue = numeral(value).format('0,0[.]0[00000000000000000]');
  res.setHeader('content-type', 'text/plain');
  res.send(formattedValue);
}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
})

app.get('/add', cacheRoute(), function (req, res) {
  const a = parseA(req);
  const b = parseB(req);
  const value = calc.add(a, b);
  sendResult(value, res);
})

app.get('/subtract', cacheRoute(), function (req, res) {
  const a = parseA(req);
  const b = parseB(req);
  const value = calc.subtract(a, b);
  sendResult(value, res);
})

app.get('/multiply', cacheRoute(), function (req, res) {
  const a = parseA(req);
  const b = parseB(req);
  const value = calc.multiply(a, b);
  sendResult(value, res);
})

app.get('/divide', cacheRoute(), function (req, res) {
  const a = parseA(req);
  const b = parseB(req);
  const value = calc.divide(a, b);
  sendResult(value, res);
})

if (!module.parent) {
  var server = app.listen(PORT, HOST);
  server.on('close', function () {
    if (cache) {
      cache.client.end(true);
    }
  });
}
module.exports = { app, cache };
