process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const expect = chai.expect;
const service = require('../service');
const app = service.app;
const cache = service.cache;

chai.use(chaiHttp);

describe('Calculator service', () => {

  var server;

  it('it should connect to the redis cache', (done) => {
    if (cache) {
      cache.on("connected", function() {
        done();
      });

      if (cache.client.connected) {
        done();
      }

      cache.on("error", function (err) {
        assert.fail(err, null);
      });
    } else {
      done();
    }
  });

  it('it should add two numbers', (done) => {
    server = app.listen();
    chai.request(server)
      .get('/add')
      .query({a: 1, b: 2})
      .end((err, res) => {
        expect(err).to.be.null;
        res.should.have.status(200);
        res.should.have.header('content-type', 'text/plain; charset=utf-8');
        res.text.should.equal('3');
        done();
      });
  });

  after(function(done) {
    if (server) {
      if (cache && cache.client.connected) {
        cache.client.end(true);
      }
      server.close(done);
    }
  });
});
