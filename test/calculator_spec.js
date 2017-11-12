var assert = require('assert');

var calc = require('../calculator.js');

describe('Calculator Tests', function() {
	describe('Addition Tests', function() {
		it('returns 1 + 1 = 2', function(done) {
			assert.equal(calc.add(1, 1), 2);
			done();
		});

		it('returns 1 + -1 = 0', function(done) {
			assert.equal(calc.add(1, -1), 0);
			done();
		});
	});

	describe('Subtraction Tests', function() {
		it('returns 2 - 1 = 1', function(done) {
			assert.equal(calc.subtract(2, 1), 1);
			done();
		});

		it('returns 1 - -1 = 2', function(done) {
			assert.equal(calc.subtract(1, -1), 2);
			done();
		});
	});

	describe('Multiply Tests', function() {
		it('returns 2 * 2 = 4', function(done) {
			assert.equal(calc.multiply(2, 2), 4);
			done();
		});

		it('returns 0 * 4 = 4', function(done) {
			assert.equal(calc.multiply(2, 2), 4);
			done();
		});
	});
});
