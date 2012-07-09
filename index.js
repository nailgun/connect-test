var EventEmitter = require('events').EventEmitter,
    methods = ['get', 'post', 'put', 'delete', 'head'],
    connect = require('connect'),
    http = require('http');
require('should');

module.exports = request;

connect.proto.request = function() {
    return request(this);
};

function request(app) {
    return new Request(app);
}

function Request(app) {
    var self = this;
    this.data = [];
    this.header = {};
    this.app = app;
    this.res = null;

    if (!this.server) {
        this.server = http.Server(app);
        this.server.listen(0, function() {
            self.addr = self.server.address();
            self.listening = true;
        });
    }
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

Request.prototype.__proto__ = EventEmitter.prototype;

methods.forEach(function(method) {
    Request.prototype[method] = function(path){
        return this.request(method, path);
    };
});

Request.prototype.set = function(field, val) {
    this.header[field] = val;
    return this;
};

Request.prototype.write = function(data) {
    this.data.push(data);
    return this;
};

Request.prototype.request = function(method, path) {
    this.method = method;
    this.path = path;
    return this;
};

Request.prototype.expect = function() {
    var args = arguments;
    this.end(function(res) {
        if (args.length >= 2 && typeof args[1] === 'string') {
            if (typeof args[0] === 'number') {
                res.statusCode.should.equal(args[0]);
                res.body.should.equal(args[1]);
            } else {
                res.headers.should.have.property(args[0].toLowerCase(), args[1]);
            }
            args[2] && args[2]();
        } else {
            if (typeof args[0] === 'number') {
                res.statusCode.should.equal(args[0]);
            } else {
                res.body.should.equal(args[0]);
            }
            args[1] && args[1]();
        }
    });
    return this;
};

Request.prototype.end = function(fn) {
    var self = this;

    if (self.req) {
        if (self.req.response) {
            fn(self.req.response);
        } else {
            self.req.on('complete', function () {
                fn(self.req.response);
            });
        }
    } else if (this.listening) {
        self.req = http.request({
            method: this.method,
            port: this.addr.port,
            host: this.addr.address,
            path: this.path,
            headers: this.header
        });

        this.data.forEach(function(chunk) {
            self.req.write(chunk);
        });

        self.req.on('response', function(res) {
            var buf = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                buf += chunk
            });
            res.on('end', function() {
                res.body = buf;
                self.req.response = res;
                self.req.emit('complete');
                fn(res);
            });
        });

        self.req.end();
    } else {
        this.server.on('listening', function() {
            self.end(fn);
        });
    }

    return this;
};
