const express = require('express');
const calc = require('./calculator.js');
var numeral = require('numeral');
var path = require('path');

const PORT = 8080;
const HOST = '0.0.0.0';

const app = express();

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

app.get('/add', function (req, res) {
  const a = parseA(req);
  const b = parseB(req);
  const value = calc.add(a, b);
  sendResult(value, res);
})

app.get('/subtract', function (req, res) {
  const a = parseA(req);
  const b = parseB(req);
  const value = calc.subtract(a, b);
  sendResult(value, res);
})

app.get('/multiply', function (req, res) {
  const a = parseA(req);
  const b = parseB(req);
  const value = calc.multiply(a, b);
  sendResult(value, res);
})

app.get('/divide', function (req, res) {
  const a = parseA(req);
  const b = parseB(req);
  const value = calc.divide(a, b);
  sendResult(value, res);
})

if (!module.parent) {
  app.listen(PORT, HOST);
}
module.exports = app;
