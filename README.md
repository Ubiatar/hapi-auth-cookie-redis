# hapi-auth-cookie-redis

Redis authentication provides simple session management. The user has to be authenticated via other means, typically a RESTful API, and upon successful authentication the browser receives an authentication cookie.

Subsequent requests containing the cookie are authenticated and validated via the provided `validateFunc` in case the user info requires validation on each request.


## Quick Start

### Installation

```
npm install --save hapi-auth-cookie-redis
```

### Configuration

The `'redis'` scheme takes the following required options:

* `param` - the request.payload or request.query param key. Defaults to `'auth'`
* `host` - the redis server host. Defaults to `'127.0.0.1'`
* `port` - the redis server port. Defaults to `6379`
* `db` - the default redis db. Defaults to `0`
* `password` - the redis auth_pass. Defaults to `''`
* `cookie` - the cookie name. Defaults to `'auth'`
* `ttl` - login expire time. Defaults to `3600` (seconds), `-1` for never, DO NOT use `0`
* `validateFunc` - an optional session validation function used to validate the auth token on each request. Used to verify that the internal session state is still valid (e.g. user account still exists). The function has the signature function(request, session, callback) where:
  * request - is the Hapi request object of the request which is being authenticated.
  * session - is the session object set via `request.auth.redis.set(user)`.
  * callback - a callback function with the signature function(err, isValid, credentials) where:
    * err - an internal error.
    * isValid - true if the content of the session is valid, otherwise false.
    * credentials - a credentials object passed back to the application in request.auth.credentials. If value is null or undefined, defaults to session. If set, will override the current session as if `request.auth.redis.set(user)` was called.

When the `redis` scheme is enabled on a route, the `request.auth.redis` objects is decorated with the following methods:

* set(value) - sets a specific object on the current session where value is a json object containing all the info about the logged user
* expire() - clears the current session

### Run the example

```
npm install 
node example/server
```

Then visit: <http://localhost:3000/example-one>

Routes:

* POST `/login`

`email` and `password` required.

Available Users:

```
[
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
]
```

* GET `/logout`

* GET `/example-one` 

No required authorization.

* GET `/example-two`

`User` required authorization

* GET `/example-three`

`Admin` required authorization because the default is admin.

* GET `/example-four/{id}`

User specific authorization required.
