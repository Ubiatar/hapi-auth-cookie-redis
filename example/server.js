var hapi = require('hapi');

// Create a new server
var server = new hapi.Server();

// Setup the server with a host and port
server.connection({
  port: parseInt(process.env.PORT, 10) || 3000,
  host: '127.0.0.1',
  router: {
    stripTrailingSlash: true
  }
});

// Export the server to be required elsewhere.
module.exports = server;

/*
 Load all plugins and then start the server.
 First: community/npm plugins are loaded
 Second: project specific plugins are loaded
 */
server.register([
  {
    register: require('./router/auth')
  },
  {
    register: require('./router/base')
  }
], function () {
  //Start the server
  server.start(function() {
    //Log to the console the host and port info
    console.log('Server started at: ' + server.info.uri);
  });
});
