// Server helper tests are typechecked by the app's test configuration.
// This declares the environment API only; tests mock all server-only transports.
declare namespace Deno {
  const env: { get(name: string): string | undefined };
}