var Joi = require('joi');
var Boom = require('boom');

exports.register = function (server, options, next) {

  server.register([
    {
      register: require('../../dist')
    }
  ], function (err) {
    if (err) {
      console.error('Failed to load a plugin:', err);
      throw err;
    }

    // Set our server authentication strategy
    server.auth.strategy('standard', 'redis', {
      // validateFunc: function (user, callback) {
      //   callback(null, false, user);
      //   // Bcrypt.compare(password, user.password, (err, isValid) => {
      //   //   callback(err, isValid, {id: user.id, name: user.name});
      //   // });
      // }
    });

  });

  server.auth.default({
    strategy: 'standard',
    scope: ['admin']
  });

  server.route({
    method: 'POST',
    path: '/login',
    config: {
      auth: false,
      validate: {
        payload: {
          email: Joi.string().email().required(),
          password: Joi.string().min(2).max(200).required()
        }
      },
      handler: function (request, reply) {

        getValidatedUser(request.payload.email, request.payload.password)
          .then(function (user) {
            if (user[1]) {
              request.auth.redis.set(user[1]).then(function () {
                return reply('OK!');
              }).catch(console.error);
            } else {
              return reply(Boom.unauthorized('Bad email or password'));
            }

          })
          .catch(function (err) {
            console.error(err);
            reply('test');
            //return reply(Boom.badImplementation());
          });
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/logout',
    config: {
      auth: false,
      handler: function (request, reply) {
        request.auth.redis.expire();
        return reply('Logout Successful!');

      }
    }
  });

  next();
}

exports.register.attributes = {
  name: 'auth'
};


/**
 * REALLY STUPID GET VALID USER - NOT FOR PRODUCITON USE.
 * Replace this with your own database lookup and make sure
 * you encrypt the passwords. Plain text passwords should not be used.
 * AGAIN THIS IS JUST TO GET THIS EXAMPLE WORKING!
 */
function randStr(len) {
  'use strict';
  let x = 'abcdefhijkmnprstwxyz2345678';
  let maxPos = x.length;
  let pwd = '';
  for (var i = 0; i < len; i++) {
    pwd += x.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
};

function getValidatedUser(email, password) {
  return new Promise(function (fulfill, reject) {

    var users = [
      {
        id: 123,
        email: 'admin@admin.com',
        password: 'admin',
        scope: ['user', 'admin', 'user-123']
      },
      {
        id: 124,
        email: 'guest@guest.com',
        password: 'guest',
        scope: ['user', 'user-124']
      },
      {
        id: 125,
        email: 'other@other.com',
        password: 'other',
        scope: ['user', 'user-125']
      }
    ];

    // This is done to remove the password before being sent.
    function grabCleanUser(user) {
      var user = user;
      delete user.password;
      return [randStr(16), user];
    };

    // very simple look up based on the user array above.
    if (email === users[0].email && password === users[0].password) {
      return fulfill(grabCleanUser(users[0]));
    } else if (email === users[1].email && password === users[1].password) {
      return fulfill(grabCleanUser(users[1]));
    } else if (email === users[2].email && password === users[2].password) {
      return fulfill(grabCleanUser(users[2]));
    } else {
      return fulfill(null);
    }
  });
}
