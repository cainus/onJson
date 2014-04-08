/*
 This middleware just adds an onJson function to the
 req and calls back when done.

 As a last or only parameter, the onJson function takes a 
 callback in the form:
 function(err, body){ ...
 where error is an error that may have occurred and body
 is the entire body of the request.

 An optional first parameter representing a json schema as
 an object is also allowed.  If specified it will be used 
 for validation.

 */
var JSV = require('JSV').JSV;

var isString = function(str){
  return (typeof str == 'string' || str instanceof String);
};

var handleBody = function(req, res, body, schema, onError, onBodyCB){
  var obj;
  if (isString(body)){
    try {
      obj = JSON.parse(body);
    } catch(ex) {
      // if it's not valid JSON...
      return onError( req, res, { reason : 'invalid json.', detail : body} );
    }
  } else {
    obj = body;
  }
  if (!!schema){
    var report = JSV.createEnvironment().validate(obj, schema);
    if (report.errors.length > 0){
      return onError(req, res, { reason : 'json failed schema validation.', detail : report.errors});
    }
  }

  return onBodyCB(null, obj);

};


var factory = function(onError){


  var onJsonMiddleware = function(req, res, cb){
    req.onJson = function(){

      var args = Array.prototype.slice.call(arguments);
      var schema, onBodyCB;
      switch(args.length){
        case 1:
          onBodyCB = args[0];
          break;

        case 2:
          schema = args[0];
          onBodyCB = args[1];
          break;

        default : throw new Error("req.onJson() was called with the wrong number of properties.");
      }

      if (req.body){
        // in case the connect 'bodyParser' middleware is active
        handleBody(req, res, req.body, schema, onError, onBodyCB); 
      } else {
        var body = '';
        req.on('data', function(data){
          body += data;
        });
        req.on('error', function(err){
          return onBodyCB(err, body);
        });
        req.on('end', function(){
          handleBody(req, res, body, schema, onError, onBodyCB);
        });
      }

    };
    cb();
  };

  return onJsonMiddleware;

};


module.exports = factory;





