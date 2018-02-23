// Validation Plugin
import joi from 'joi'
// Assert Errors
import hoek from 'hoek'
// Cyphering Lib
import iron from 'iron'
// Http Error
import boom from 'boom'
// Redis Client
import redis from 'promise-redis'
// Uid util
import uid from 'uid'

const internals = {}

internals.schema = joi.object({
  param: joi.string().default('auth'),
  host: joi.string().default('127.0.0.1'),
  port: joi.number().integer().min(1).max(65535).default(6379),
  db: joi.number().integer().min(0).max(255).default(0),
  password: joi.string().default(''),
  ttl: joi.number().integer().min(0).default(3600),
  validateFunc: joi.func(),
  cookie: joi.string().min(3).max(20).default('auth'),
  secure: joi.bool().default(true),
  decoratorName: joi.string().min(3).max(30).default('redis'),
  ironKey: joi.string().min(32).required()
}).required()

exports.plugin = {
  async register (server, options) {
    server.auth.scheme('redis', (server, options) => {
      const results = joi.validate(options, internals.schema)
      hoek.assert(!results.error, results.error)

      const settings = results.value

      const redisOptions = {
        port: settings.port,
        host: settings.host,
        auth_pass: settings.password,
        ttl: settings.ttl,
        db: settings.db
      }
      const client = redis().createClient(redisOptions)
      client.on('error', (err) => {
        hoek.assert(!err, err)
      })

      server.ext('onPreAuth', (request, reply) => {
        request.auth[settings.decoratorName] = {
          set: async(session) => {
            hoek.assert(session && typeof session === 'object', 'Invalid session')
            await client.select(redisOptions.db)
            let key
            let exists
            do {
              key = uid(64)
              exists = await client.get(`${settings.param}:${key}`)
            } while (exists)
            await client.set(`${settings.param}:${key}`, JSON.stringify(session))
            await client.expire(`${settings.param}:${key}`, redisOptions.ttl)
            request.auth.artifacts = session
            const ironedKey = await iron.seal(key, settings.ironKey, iron.defaults)
            reply.state(settings.cookie, ironedKey, {
              isSecure: settings.secure
            })
          },
          expire: async() => {
            const key = request.state[settings.cookie]
            hoek.assert(key, 'No active session to expire key from')
            await client.select(redisOptions.db)
            await client.expire(`${settings.param}:${key}`, 0)
            request.auth.artifacts = null
            reply.unstate(settings.cookie)
          }
        }
        return reply.continue()
      })
      const scheme = {
        authenticate: async(request, reply) => {
          const param = settings.param
          const ironedKey = request.state[settings.cookie]
          const key = iron.unseal(ironedKey, settings.ironKey, iron.defaults)
          await client.select(redisOptions.db)
          let session = await client.get(`${param}:${key}`)
          if (session === null) return reply(boom.unauthorized(''))
          session = JSON.parse(session || '{}')
          if (!settings.validateFunc) return reply.continue({credentials: session, artifacts: session})

          settings.validateFunc(request, session, (err, isValid, credentials) => {
            if (err || !isValid) {
              return reply(boom.unauthorized(''), null, {
                credentials: credentials || session,
                artifacts: session
              })
            }
            return reply.continue({credentials: credentials || session, artifacts: session})
          })
        }
      }
      return scheme
    })
  },

  pkg: require('../package.json')
}
