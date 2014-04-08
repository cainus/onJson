var should = require('should');
var factory = require('../index');
var http = require('http');
var connect = require('connect');
var hottap = require('hottap').hottap;
    var server;

// TODO test bad schema, successful schema, json parse error
describe("onJson", function(){
  it ("sets the error param when there's an error", function(done){
    var res = {};
    var req = {
      on : function(type, cb){
        switch(type){
          case 'error' : return cb('some error');
          case 'data' : return cb('{"asdf":"asdf"}');
        }
      }
    };
    var middleware = factory(function(req, res, info){ throw "there shouldn't be an error!";});
    middleware(req, res, function(){
      req.onJson(function(err, obj){
        err.should.equal('some error');
        done();
      });
    });
  });
  describe("when used on a real server", function(){
    afterEach(function(done){
      server.close(function(){
        done();
      });
    });
    it ("sets onJson on the object", function(done){
      var app = connect();
      var middleware = factory(function(req, res, info){ throw "there shouldn't be an error!";});
      app.use(middleware);
      app.use(function(req, res){
        res.end((typeof req.onJson));
      });
      server = http.createServer(app).listen(3000, function(){
        hottap("http://localhost:3000/asdf").request("POST", function(err, response){
          should.not.exist(err);
          response.body.should.equal('function');
          done();
        });
      });
    });
    it ("throws an error when called with 2+ params", function(done){
      var app = connect();
      var middleware = factory(function(req, res, info){ throw "there shouldn't be an error!";});
      app.use(middleware);
      app.use(function(req, res){
        try {
          req.onJson({}, {}, function(err, obj){
            should.not.exist(err);
          });
        } catch(ex){
          res.end(ex.message);
        }
      });
      server = http.createServer(app).listen(3000, function(){
        hottap("http://localhost:3000/asdf").request("POST", {"Content-Type" : "application/json"}, 
             '{"subject":"blah"}', function(err, response){
               should.not.exist(err);
               response.body.should.equal('req.onJson() was called with the wrong number of properties.');
               done();
        });
      });

    });
    it ("sets an obj param when successful", function(done){
      var app = connect();
      var middleware = factory(function(req, res, info){
        throw "there shouldn't be an error!";
      });
      app.use(middleware);
      app.use(function(req, res){
        req.onJson(function(err, obj){
          should.not.exist(err);
          res.end(JSON.stringify(obj));
        });
      });
      server = http.createServer(app).listen(3000, function(){
        hottap("http://localhost:3000/asdf").request("POST", {"Content-Type" : "application/json"}, 
             '{"subject":"blah"}', function(err, response){
               should.not.exist(err);
               response.body.should.equal('{"subject":"blah"}');
               done();
        });
      });
    });
    it ("responds with an error if json doesn't parse", function(done){
      var app = connect();
      var middleware = factory(function(req, res, info){
        should.exist(info);
        res.end(JSON.stringify(info));
      });
      app.use(middleware);
      app.use(function(req, res){
        req.onJson(function(err, obj){
          throw "should not get here!";
        });
      });
      server = http.createServer(app).listen(3000, function(){
        hottap("http://localhost:3000/asdf").request("POST", {"Content-Type" : "application/json"}, 
             '{"subject":"blah"', function(err, response){
               should.not.exist(err);
              var obj = JSON.stringify({"reason" : "invalid json.",
                                        "detail" : "{\"subject\":\"blah\"" });
               response.body.should.equal(obj);
               done();
        });
      });
    });
    it ("responds with an error if input incorrectly has additional properties", function(done){
      var schema = {
               "properties": {
                  "age": {
                    "type": "number"
                  },
                  "name": {
                    "type": "string"
                  }
                },
                "additionalProperties" : false
              };
      var app = connect();
      var middleware = factory(function(req, res, info){ 
        should.exist(info);
        res.end(JSON.stringify(info));
      });
      app.use(middleware);
      app.use(function(req, res){
        req.onJson(schema, function(err, obj){
          throw "should not get here!";
        });
      });
      server = http.createServer(app).listen(3000, function(){
        hottap("http://localhost:3000/asdf").request("POST", {"Content-Type" : "application/json"}, 
             '{"age":37, "name":"GDizzle", "wrong" : "wrong"}', function(err, response){
              // above mistakenly sends an additional property when
              // additionalProperties is false
               should.not.exist(err);
               var info = JSON.parse(response.body);
               info.reason.should.equal('json failed schema validation.');
               info.detail[0].message.should.equal('Additional properties are not allowed');
               // detail looks like this:
               // [ { uri: 'urn:uuid:167293d9-3c95-493d-826e-1bfd4146a8b9#',
               // schemaUri: 'urn:uuid:b7e07efd-fd80-4370-8206-9162f4c39cc9#',
               // attribute: 'additionalProperties',
               // message: 'Additional properties are not allowed',
               // details: false } ]
               done();
        });
      });
    });
    it ("throws errors when input type doesn't match schema", function(done){
      var schema = {
               "properties": {
                  "age": {
                    "type": "number"
                  },
                  "name": {
                    "type": "string"
                  }
                },
                "additionalProperties" : false
              };
      var app = connect();
      var middleware = factory(function(req, res, info){ 
        should.exist(info);
        res.end(JSON.stringify(info));
      });
      app.use(middleware);
      app.use(function(req, res){
        req.onJson(schema, function(err, obj){
          throw "should not get here!";
        });
      });
      server = http.createServer(app).listen(3000, function(){
        hottap("http://localhost:3000/asdf").request("POST", {"Content-Type" : "application/json"}, 
             '{"age":"37", "name":"GDizzle"}', function(err, response){
              // mistakenly send age as a string
               should.not.exist(err);
               var info = JSON.parse(response.body);
               info.reason.should.equal('json failed schema validation.');
               info.detail[0].details[0].should.equal('number');
               // detail looks like this:
               // [ { uri: 'urn:uuid:67ef53a9-1b09-48b1-b97d-fae313e4ee39#/age',
               // schemaUri: 'urn:uuid:51edca59-120a-4486-a961-0ee2aa5c276b#/properties/age',
               // attribute: 'type',
               // message: 'Instance is not a required type',
               // details: [ 'number' ] } ]
               done();
        });
      });
    });
    it ("errors on regex NON-matches with \\w characters", function(done){
      var schema = {
               "properties": {
                  "emailAddress": {
                    "type": "string",
                    "pattern" : "^\\w+@\\w+\\.\\w+$"
                  },
                  "name": {
                    "type": "string"
                  }
                },
                "additionalProperties" : false
              };
      var app = connect();
      var middleware = factory(function(req, res, info){ 
        should.exist(info);
        res.end(JSON.stringify(info));
      });
      app.use(middleware);
      app.use(function(req, res){
        req.onJson(schema, function(err, obj){
          res.end(JSON.stringify(obj));
        });
      });
      server = http.createServer(app).listen(3000, function(){
        hottap("http://localhost:3000/asdf").request("POST", {"Content-Type" : "application/json"}, 
             '{"name":"allen steven david foster", "emailAddress":"asdf@asdfcom"}', function(err, response){
               // email address is missing a .
               should.not.exist(err);
               var body = JSON.parse(response.body);
               body.detail[0].message.should.equal('String does not match pattern');
               done();
        });
      });
    });
    it ("allows regex matches with \\w characters", function(done){
      var schema = {
               "properties": {
                  "emailAddress": {
                    "type": "string",
                    "pattern" : "^\\w+@\\w+\\.\\w+$"
                  },
                  "name": {
                    "type": "string"
                  }
                },
                "additionalProperties" : false
              };
      var app = connect();
      var middleware = factory(function(req, res, info){ 
        should.exist(info);
        res.end(JSON.stringify(info));
      });
      app.use(middleware);
      app.use(function(req, res){
        req.onJson(schema, function(err, obj){
          res.end(JSON.stringify(obj));
        });
      });
      server = http.createServer(app).listen(3000, function(){
        hottap("http://localhost:3000/asdf").request("POST", {"Content-Type" : "application/json"}, 
             '{"name":"allen steven david foster", "emailAddress":"asdf@asdf.com"}', function(err, response){
               should.not.exist(err);
               var body = JSON.parse(response.body);
               body.emailAddress.should.equal("asdf@asdf.com");
               done();
        });
      });
    });
  });
});
