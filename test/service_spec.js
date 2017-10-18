process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const should = chai.should();
const expect = chai.expect;
const app = require('../service');

chai.use(chaiHttp);

describe('Calculator service', () => {

  var server;

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
      server.close(done);
    }
  });
});
