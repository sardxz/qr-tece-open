const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// NOTA: `unstable_enablePackageExports = true` quebra o dev server do Expo SDK 54
// (causa TypeError "path argument must be of type string" no Metro durante serve).
// Desabilitado por padrão. Se o erro "Unable to resolve ./useQueries.js" voltar
// pro TanStack Query, considerar alternativas: downgrade de @tanstack/react-query
// pra versão CJS-compat, ou hook de resolver custom específico pra ele.

module.exports = config;
