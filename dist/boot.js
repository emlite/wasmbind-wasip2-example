// boot.js
import { instantiate as initHost } from "./emlite/emlite.js";
import { instantiate as initApp } from "./app/main.js";

// Local Preview-2 shims you have on disk
import * as cliMod from "./shim/preview2-shim/lib/browser/cli.js";
import * as ioMod from "./shim/preview2-shim/lib/browser/io.js";
import * as clocksMod from "./shim/preview2-shim/lib/browser/clocks.js";
import * as randMod from "./shim/preview2-shim/lib/browser/random.js";
import * as fsMod from "./shim/preview2-shim/lib/browser/filesystem.js";
import * as httpMod from "./shim/preview2-shim/lib/browser/http.js";

const or = (...xs) => xs.find(Boolean);

// jco core wasm resolvers
const getHostCore = (p) =>
  WebAssembly.compileStreaming(
    fetch(new URL(`./emlite/${p}`, import.meta.url))
  );
const getAppCore = (p) =>
  WebAssembly.compileStreaming(fetch(new URL(`./app/${p}`, import.meta.url)));

// tolerate both instantiate signatures: (getCore, imports) and (imports, getCore)
async function inst(init, imports, getCore) {
  try {
    return await init(getCore, imports);
  } catch (eA) {
    try {
      return await init(imports, getCore);
    } catch (eB) {
      eA.message += `\nFallback signature also failed: ${eB.message}`;
      throw eA;
    }
  }
}

function buildWasiImports() {
  const cli = cliMod;
  const io = ioMod;
  const clocks = clocksMod;
  const random = randMod;
  const fs = fsMod;
  const http = httpMod;

  return {
    // wasi:cli/*
    "wasi:cli/environment": cli.environment,
    "wasi:cli/exit": cli.exit,
    "wasi:cli/stdin": cli.stdin,
    "wasi:cli/stdout": cli.stdout,
    "wasi:cli/stderr": cli.stderr,
    "wasi:cli/terminal-input": or(cli.terminalInput, cli["terminal-input"]),
    "wasi:cli/terminal-output": or(cli.terminalOutput, cli["terminal-output"]),
    "wasi:cli/terminal-stdin": or(cli.terminalStdin, cli["terminal-stdin"]),
    "wasi:cli/terminal-stdout": or(cli.terminalStdout, cli["terminal-stdout"]),
    "wasi:cli/terminal-stderr": or(cli.terminalStderr, cli["terminal-stderr"]),

    // wasi:io/*
    "wasi:io/streams": or(io.streams, io["streams"]),
    "wasi:io/error": or(io.error, io["error"]),
    "wasi:io/poll": or(io.poll, io["poll"]),

    // wasi:clocks/*
    "wasi:clocks/monotonic-clock": or(
      clocks.monotonicClock,
      clocks["monotonic-clock"],
      clocks.monotonic_clock
    ),
    "wasi:clocks/wall-clock": or(
      clocks.wallClock,
      clocks["wall-clock"],
      clocks.wall_clock
    ),

    // wasi:random/*
    "wasi:random/random": or(random.random, random["random"]),

    // wasi:filesystem/*
    "wasi:filesystem/preopens": or(fs.preopens, fs["preopens"]),
    "wasi:filesystem/filesystem": or(fs.filesystem, fs["filesystem"]),
    "wasi:filesystem/types": or(fs.types, fs["types"]),
    "wasi:filesystem/descriptor": or(fs.descriptor, fs["descriptor"]),

    // wasi:http/*
    "wasi:http/types": or(http.types, http["types"]),
    "wasi:http/fields": or(http.fields, http["fields"]),
    "wasi:http/error": or(http.error, http["error"]),
    "wasi:http/outgoing-handler": or(
      http.outgoingHandler,
      http["outgoing-handler"]
    ),
    "wasi:http/incoming-handler": or(
      http.incomingHandler,
      http["incoming-handler"]
    ),
    "wasi:http/outgoing-body": or(http.outgoingBody, http["outgoing-body"]),
    "wasi:http/incoming-body": or(http.incomingBody, http["incoming-body"]),
  };
}

export default async function init() {
  const wasi = buildWasiImports();

  // stub until app is ready
  let applyImpl = () => {
    throw new Error("app not ready");
  };
  const dyncall = { apply: (fidx, argv, data) => applyImpl(fidx, argv, data) };

  // ---- HOST: needs WASI + dyncall
  const host = await inst(
    initHost,
    {
      ...wasi,
      "emlite:env/dyncall": dyncall,
      "emlite:env/dyncall@0.1.0": dyncall,
    },
    getHostCore
  );

  // ---- APP: needs WASI too + the host import
  const app = await inst(
    initApp,
    {
      ...wasi,
      "emlite:env/host": host.host,
      "emlite:env/host@0.1.0": host.host,
    },
    getAppCore
  );

  // close the loop: wire the real trampoline
  applyImpl =
    app["emlite:env/dyncall"]?.apply ??
    app["emlite:env/dyncall@0.1.0"]?.apply ??
    app.exports?.emlite_env_dyncall_apply;

  return app;
}
