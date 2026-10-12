// 'server-only' melempar galat di luar bundler Next. Di tes (tsx) modul itu dianggap kosong.
// Impor file ini PALING PERTAMA di tes yang memuat modul server.
import Module from 'node:module'

const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown }
const original = loader._load
loader._load = function (request: string, ...rest: unknown[]) {
  if (request === 'server-only') return {}
  return original.call(this, request, ...rest)
}
