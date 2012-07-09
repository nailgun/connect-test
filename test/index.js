var connect = require('connect');
require('..');

describe('connect.request()', function () {
	it('should do one request per request object', function (done) {
		var app = connect();

		var requestCount = 0;
		app.use(function (req, res) {
			requestCount++;
			res.setHeader('Content-Type', 'text/plain')
			res.statusCode = 404;
			res.end('body');
		});

		app.request()
		.get('/')
		.expect(404)
		.expect('body')
		.expect(404, 'body')
		.expect('Content-Type', 'text/plain')
		.end(function (res) {
			res.body.should.equal('body');
			requestCount.should.equal(1);
			done();
		});
	});

	var methods = ['get', 'post', 'put', 'delete', 'head'];
	methods.forEach(function (method) {
		testMethod(method);
	});
	function testMethod (method) {
		describe('#.'+method, function () {
			it('should request using method '+method.toUpperCase(), function (done) {
				var app = connect();

				app.use(function (req, res) {
					req.method.should.equal(method.toUpperCase());
					req.url.should.equal('/superurl');
					res.end();
				});

				app.request()[method]('/superurl')
				.end(function (res) {
					done();
				});
			});
		});
	};

	describe('#.set()', function () {
		it('should set request headers', function (done) {
			var app = connect();

			app.use(function (req, res) {
				req.headers['if-none-match'].should.equal('etag123');
				req.headers['accept-encoding'].should.equal('superencoding');
				res.end();
			});

			app.request()
			.get('/')
			.set('If-None-Match', 'etag123')
			.set('Accept-Encoding', 'superencoding')
			.end(function (res) {
				done();
			});
		});
	});

	describe('#.write()', function () {
		it('should append data to request body', function (done) {
			var app = connect();

			app.use(function (req, res) {
				var buf = '';
    			req.setEncoding('utf8');
    			req.on('data', function (chunk) {
    				buf += chunk;
    			});
			    req.on('end', function () {
					buf.should.equal('data1data2data3')
					res.end();
			    });
			});

			app.request()
			.post('/')
			.write('data1')
			.write('data2')
			.write('data3')
			.end(function (res) {
				done();
			});
		});
	});
});