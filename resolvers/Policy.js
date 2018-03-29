const semver = require('semver')
const Security = require('./Security')
const {
  PASS, FAIL, NUDGE, UNKNOWN, UNSUPPORTED,
  ALWAYS, SUGGESTED, IF_SUPPORTED, NEVER
} = require('../src/constants')

const isObject = o => Object(o) === o
const isBool = b => typeof b === 'boolean'

const Policy = {

  async validate (root, args, context) {
    const { policy } = args
    let result = PASS

    for (let verification in policy) {
      let compliance = policy[verification]

      const passing = await Security[verification](root, policy, context)

      if (Array.isArray(passing)) {
        for (let i = 0; i < passing.length; i++) {
          let itemCompliance = compliance[i]
          let itemPassing = passing[i]

          switch (itemPassing) {
            case false:
              if (itemCompliance === ALWAYS) {
                return FAIL
              }
              break

            case UNSUPPORTED:
              if (itemCompliance !== IF_SUPPORTED) {
                return FAIL
              }

            default: // true, no early return
              break
          }
        }
      } else {
        switch (passing) {
          case false:
            if (compliance === ALWAYS || (compliance !== IF_SUPPORTED && compliance !== NEVER)) {
              return FAIL
            }
            break

          case UNSUPPORTED:
            if (compliance !== IF_SUPPORTED) {
              return FAIL
            }

          case true:
            if (compliance === NEVER) {
              return FAIL
            }

          default: // true, no early return
            break
        }
      }
    }

    return PASS
  },

  async validateWithDetails (root, args, context) {
    const { policy } = args
    let results = Object.assign({ status: PASS }, policy)

    for (let verification in policy) {
      let compliance = policy[verification]

      const passing = await Security[verification](root, policy, context)

      if (Array.isArray(passing)) {
        results[verification] = []

        for (let i = 0; i < passing.length; i++) {
          results[verification][i] = {
            name: passing[i].name,
            status: passing[i].passing ? PASS : FAIL
          }

          if (!passing[i].passing) {
            results.status = FAIL
          }
        }
      } else {
        results[verification] = PASS

        let failed = false

        switch (passing) {
          case false:
            if (compliance === ALWAYS || (compliance !== IF_SUPPORTED && compliance !== NEVER)) {
              failed = true
            }
            break

          case UNSUPPORTED:
            if (compliance !== IF_SUPPORTED) {
              failed = true
            }
            break

          case true:
            if (compliance === NEVER) {
              failed = true
            }
            break

          default:
            break
        }

        if (failed) {
          results[verification] = FAIL
          results.status = FAIL
        }
      }
    }

    return results
  },

  async validateV2 (root, args, context) {
    const { policy } = args
    let results = Object.assign({ status: PASS }, policy)

    for (let verification in policy) {
      if (verification === 'osVersion') {
        verification += 'V2'
      }

      let compliance = policy[verification]

      const passing = await Security[verification](root, policy, context)

      if (verification === 'osVersionV2') {
        verification = 'osVersion'
      }

      if (Array.isArray(passing)) {
        results[verification] = []

        for (let i = 0; i < passing.length; i++) {
          results[verification][i] = {
            name: passing[i].name,
            status: passing[i].passing ? PASS : FAIL
          }

          if (!passing[i].passing) {
            results.status = FAIL
          }
        }
      } else {
        results[verification] = PASS

        let failed = false

        switch (passing) {
          case false:
            if (compliance === ALWAYS || (compliance !== IF_SUPPORTED && compliance !== NEVER)) {
              failed = true
            }
            break

          case UNSUPPORTED:
            if (compliance !== IF_SUPPORTED) {
              failed = true
            }
            break

          case NUDGE:
            results[verification] = NUDGE
            results.status = NUDGE
            break

          case true:
            if (compliance === NEVER) {
              failed = true
            }
            break

          default:
            break
        }

        if (failed) {
          results[verification] = FAIL
          results.status = FAIL
        }
      }
    }

    return results
  }
}

module.exports = Policy