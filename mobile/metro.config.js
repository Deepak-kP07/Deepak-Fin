const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

// The app reuses the web project's pure calculation modules (../lib — loan maths, budgets, credit
// card cycles, Family/Company totals…) so both apps always agree on the numbers. `@/lib/...` is
// the web project's import alias; it resolves to ../lib here too. Only import files that have no
// browser/Next.js dependencies (see src/lib/shared.js for the list).
const projectRoot = __dirname
const webRoot = path.resolve(projectRoot, '..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [path.join(webRoot, 'lib')]
const defaultResolve = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/lib/')) {
    return context.resolveRequest(context, path.join(webRoot, moduleName.slice(2)), platform)
  }
  return (defaultResolve || context.resolveRequest)(context, moduleName, platform)
}

// NativeWind wraps last so it sees (and keeps) the shared-lib resolver above.
module.exports = withNativeWind(config, { input: './global.css' })
