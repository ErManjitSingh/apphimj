/**
 * Test-only ESM resolver: lets `node --test` follow this project's Vite-style
 * extensionless relative imports (e.g. `./leadStatusLabel`) without a bundler.
 * Not used by the app itself — Vite handles this resolution at build/dev time.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('data:text/javascript,export async function resolve(specifier, context, next) {\n' +
  '  try {\n' +
  '    return await next(specifier, context);\n' +
  '  } catch (err) {\n' +
  '    if (err.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) {\n' +
  '      for (const ext of [".js", "/index.js"]) {\n' +
  '        try {\n' +
  '          return await next(specifier + ext, context);\n' +
  '        } catch {}\n' +
  '      }\n' +
  '    }\n' +
  '    throw err;\n' +
  '  }\n' +
  '}\n', pathToFileURL('./'));
