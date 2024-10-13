import { NS } from "@ns";
import { BinaryHeap } from "util/heap";

type ErrorTypes = "procedure" | "communication";
export class ProtocolError extends Error {
  type: ErrorTypes;

  constructor(type: ErrorTypes, message?: string) {
    super(message);

    this.type = type;
  }
}

type HandlerInput<Context, Input> = Context extends Record<string, never> ? {
  input: Input,
} : {
  ctx: Context,
  input: Input
};

interface Procedure<Type extends "query" | "mutation", Context, Input, Output> {
  type: Type;
  resolve: (input: HandlerInput<Context, Input>) => Promise<Output>;
  priority: number;
}
type AnyProcedure = Procedure<"query", any, any, any> | Procedure<"mutation", any, any, any>;
const isAnyProcedure = (obj: unknown): obj is AnyProcedure =>  typeof obj === "object" &&
  obj !== null &&
  "type" in obj &&
  (obj.type === "query" || obj.type === "mutation") &&
  "resolve" in obj &&
  typeof obj.resolve === "function";
type ClientProcedureCaller<Input, Output> = Input extends undefined ? (() => Promise<Output>) : ((input: Input) => Promise<Output>);

interface RouterRecord {
  [key: string]: RouterRecord | AnyProcedure;
}
interface ClientRouterCallerRecord {
  [key: string]: ClientRouterCallerRecord | ClientProcedureCaller<any, any>;
}

type ProcedureBuilderData = {
  priority: number;
}
export class ProcedureBuilder<Context, Input = undefined, Output = void> {
  protected data: ProcedureBuilderData = {
    priority: 0
  };

  public constructor(data?: Partial<ProcedureBuilderData>) {
    if (this.data) this.data = { ...this.data, ...data };
  }

  public input<I>(): ProcedureBuilder<Context, I, Output> {
    return new ProcedureBuilder<Context, I, Output>(this.data);
  }

  public output<O>(): ProcedureBuilder<Context, Input, O> {
    return new ProcedureBuilder<Context, Input, O>(this.data);
  }

  public priority(n: number): ProcedureBuilder<Context, Input, Output> {
    return new ProcedureBuilder<Context, Input, Output>({ ...this.data, priority: n });
  }

  public query(resolve: (request: HandlerInput<Context, Input>) => Promise<Output>): Procedure<"query", Context, Input, Output> {
    return {
      type: "query",
      resolve,
      priority: this.data.priority
    }
  }

  public mutation(resolve: (request: HandlerInput<Context, Input>) => Promise<Output>): Procedure<"mutation", Context, Input, Output> {
    return {
      type: "mutation",
      resolve,
      priority: this.data.priority
    };
  }
}

type ProtocolClient<R extends RouterRecord> = {
  [A in keyof R]: R[A] extends RouterRecord
    ? ProtocolClient<R[A]>
    : R[A] extends Procedure<"query" | "mutation", any, infer I, infer O>
      ? ClientProcedureCaller<I, O>
      : never;
};

type ProtocolServer<Context> = {
  setContext(context: Context): void;
  tick(): Promise<void>;
}

type GetPath<O, P extends string> =
  P extends `${infer A}.${infer B}`
    ? A extends keyof O
      ? GetPath<O[A], B>
      : never
    : P extends keyof O
      ? O[P]
      : never;


type _RouterPaths<R> = R extends RouterRecord ? { [K in keyof R]: `.${K & string}${_RouterPaths<R[K]>}` }[keyof R] : "";
type RouterPaths<R extends RouterRecord> = { [K in keyof R]: `${K & string}${_RouterPaths<R[K]>}` }[keyof R];

type GetProcedure<R extends RouterRecord, P extends RouterPaths<R>> = GetPath<R, P> extends infer K
  ? K extends Procedure<"query" | "mutation", any, any, any>
    ? K
    : never
  : never;


type ProtocolRequest<R extends RouterRecord> = {
  [A in RouterPaths<R>]: {
    identifier: "ProtocolRequest";
    origin: number;
    procedure: A;
    payload: GetProcedure<R, A> extends infer K ? K extends Procedure<"query" | "mutation", any, infer I, any> ? I : never : never;
  }
}[RouterPaths<R>];
const isProtocolRequest = <R extends RouterRecord>(obj: unknown): obj is ProtocolRequest<R> => typeof obj === "object" &&
  obj !== null &&
  "identifier" in obj &&
  obj.identifier === "ProtocolRequest";

type ProtocolResponse<R extends RouterRecord> = {
  [A in RouterPaths<R>]: {
    identifier: "ProtocolResponse";
    procedure: A;
  } & ({
    success: false;
  } | {
    success: true;
    payload: GetProcedure<R, A> extends infer K ? K extends Procedure<"query" | "mutation", any, any, infer O> ? O : never : never;
  })
}[RouterPaths<R>];
const isProtocolResponse = <R extends RouterRecord>(obj: unknown): obj is ProtocolResponse<R> => typeof obj === "object" &&
  obj !== null &&
  "identifier" in obj &&
  obj.identifier === "ProtocolResponse";

function createClientProcedureCaller<
  R extends RouterRecord,
  P extends RouterPaths<R>,
  Pc = GetProcedure<R, P>,
  Input = Pc extends Procedure<"query" | "mutation", any, infer K, any> ? K : never,
  Output = Pc extends Procedure<"query" | "mutation", any, any, infer K> ? K : never,
>(ns: NS, path: P, port: Port, opts: Required<ClientOpts<R>>, debug = false): ClientProcedureCaller<Input, Output> {
  return (async input => {
    const request = {
      identifier: "ProtocolRequest",
      origin: ns.pid,
      procedure: path,
      payload: input 
    } as ProtocolRequest<R>;

    const rejectionLog: string[] = [];
    for (let i = 0; i <= opts.retries; i++) {
      ns.writePort(port.external, request);
      const handle = ns.getPortHandle(ns.pid);

      const result = await new Promise<ProtocolResponse<R>>((res, rej) => {
        const start = Date.now();
        const checkWrite = () => {
          if (Date.now() - start > opts.timeout) return rej("Timeout");
          if (handle.empty()) return void setTimeout(checkWrite, 10);
          const response = handle.read();
          if (!isProtocolResponse<R>(response)) return rej(`Invalid response '${JSON.stringify(response)}'`);
          res(response);
        };
        checkWrite();
      }).catch(rej => (rejectionLog.push(rej ?? "Unknown error"), null));
      if (result === null) continue;
      if (result.procedure !== request.procedure) {
        rejectionLog.push(`Procedure mismatch: Found '${result.procedure}', Expected '${request.procedure}'`);
        continue;
      }
      if (!result.success) throw new ProtocolError("procedure");

      if (debug && rejectionLog.length !== 0) ns.tprintf("%s", `Protocol call to '${request.procedure}' resolved after ${rejectionLog.length} rejections:\n  ${rejectionLog.join("\n  ")}`);
      return result.payload as Output;
    }
    throw new ProtocolError("communication", `No successful response after ${opts.retries + 1} tries. Rejection reasons:\n  ${rejectionLog.join("\n  ")}`);
  }) as ClientProcedureCaller<Input, Output>; // assertion due to conditional input on the caller
}

interface ClientOpts<R extends RouterRecord> {
  router: R,
  timeout?: number,
  retries?: number,
}
function createProtocolClient<R extends RouterRecord>(ns: NS, port: Port, opts: ClientOpts<R>, debug = false): ProtocolClient<R> {
  const options: Required<ClientOpts<R>> = {
    timeout: 10 * 1000,
    retries: 2,
    ...opts
  };

  const recurse = (entry: RouterRecord | AnyProcedure, stack: string = ""): ClientRouterCallerRecord | ClientProcedureCaller<any, any> => {
    if (((obj: unknown): obj is AnyProcedure => typeof obj === "object" &&
      obj !== null &&
      "type" in obj &&
      (obj.type === "query" || obj.type === "mutation")
    )(entry)) {
      return createClientProcedureCaller(ns, stack as RouterPaths<R>, port, options, debug);
    }
    return Object.entries(entry).reduce((acc, cur): ClientRouterCallerRecord => (acc[cur[0]] = recurse(cur[1], stack ? `${stack}.${cur[0]}` : cur[0]), acc), {} as ClientRouterCallerRecord);
  };

  return recurse(options.router) as ProtocolClient<R>;
}

function getProcedure<R extends RouterRecord, P extends RouterPaths<R>>(router: R, path: P): GetProcedure<R, P> | null {
  const parts = path.split(".");
  let current: RouterRecord | AnyProcedure = router;
  for (const part of parts) {
    if (isAnyProcedure(current) || !(part in current)) return null;
    current = current[part];
  }
  if (!isAnyProcedure(current)) return null;
  return current as GetProcedure<R, P>;
}


type ServerOpts<Context, R extends RouterRecord> = Context extends Record<string, never> ? {
  router: R,
} : {
  router: R,
  context: Context
}
function createProtocolServer<Context, R extends RouterRecord>(ns: NS, port: Port, opts: ServerOpts<Context, R>, debug = false): ProtocolServer<Context> {
  const queue = new BinaryHeap<{
    request: ProtocolRequest<R>;
    requestId: number;
    procedure: AnyProcedure;
  }>({
    key: r => `r-${r.requestId}`,
    compare: (a, b) => a.procedure.type === b.procedure.type ? a.procedure.priority < b.procedure.priority : a.procedure.type !== "mutation",
  });
  let requestId = 0;

  const tick = async (): Promise<void> => {
    const handle = ns.getPortHandle(port.external);

    while (!handle.empty()) {
      const request = handle.read();
      if (!isProtocolRequest<R>(request)) {
        if (debug) ns.tprint(`Protocol on port ${port.internal} recieved an invalid request: '${JSON.stringify(request)}'`);
        continue;
      }
      const procedure = getProcedure(opts.router, request.procedure);
      if (procedure === null) {
        if (debug) ns.tprint(`Protocol on port ${port.internal} recieved a request with an invalid procedure: '${request.procedure}'`);
        continue;
      }
      queue.insert({
        requestId: requestId++,
        request,
        procedure
      });
    }

    while (queue.getMin() !== null) {
      const current = queue.extractMin()!;

      const inputs = {
        input: current.request.payload,
        ...("context" in opts ? { ctx: opts.context } : {})
      } as HandlerInput<Context, any>;

      let success = true;
      const res = await current.procedure.resolve(inputs).catch(() => { success = false; });

      const response: ProtocolResponse<R> = success ? {
        identifier: "ProtocolResponse",
        procedure: current.request.procedure,
        success: true,
        payload: res
      } : {
        identifier: "ProtocolResponse",
        procedure: current.request.procedure,
        success: false
      };

      ns.writePort(current.request.origin, response);
    }
  };

  return {
    tick,
    setContext: (c: Context) => {
      if ("context" in opts) opts.context = c;
      throw new Error("Trying to set a context on a Protocol without any Context");
    },
  } satisfies ProtocolServer<Context>;
}

type Port = {
  internal: number;
  external: number;
}

interface Protocol<Context> {
  router: <R extends RouterRecord>(routes: R) => R;
  procedure: ProcedureBuilder<Context>;
  createProtocolClient: <R extends RouterRecord>(ns: NS, opts: ClientOpts<R>) => ProtocolClient<R>;
  createProtocolServer: <R extends RouterRecord>(ns: NS, opts: ServerOpts<Context, R>) => ProtocolServer<Context>;
}

type ProtocolOpts = {
  port: number;

  debug?: boolean;
}
export function initProtocol<Context = Record<string, never>>(protocolOpts: ProtocolOpts): Protocol<Context> {
  const port: Port = {
    internal: protocolOpts.port,
    external: Number.MAX_SAFE_INTEGER - protocolOpts.port,
  };

  return {
    procedure: new ProcedureBuilder<Context>(),
    router: <R extends RouterRecord>(routes: R) => routes,
    createProtocolClient: <R extends RouterRecord>(ns: NS, opts: ClientOpts<R>) => createProtocolClient(ns, port, opts, protocolOpts.debug ?? false),
    createProtocolServer: <R extends RouterRecord>(ns: NS, opts: ServerOpts<Context, R>) => createProtocolServer<Context, R>(ns, port, opts, protocolOpts.debug ?? false)
  }
}

/*
// 1. Define a Protocol

export type AppContext = { ns: NS };
export const p = initProtocol<AppContext>({
	port: 1000,
	debug: true // Enable logging of communication errors
});

const subRouter = p.router({
  greet: p.procedure
    .input<string>()
    .output<string>()
    .priority(5) // Set a priority, defaults to the 0
    .query(async ({ input, ctx }) => await Promise.resolve(`Hello ${input}!`)),
});

export const appRouter = p.router({
  greetings: subRouter,
  db: {
    post: p.procedure
      .input<string>()
      .mutation(async({ input: ctx }) => {
        await ns.write("text.txt", input);
      }),
  },
});

// ------------------
// 2. Create a server

import { p, appRouter } from "router.ts";

export async function main(ns: NS) {
  const server = p.createProtocolServer(ns, {
    router: appRouter,
    context: { ns }
  });

  while (true) {
    await ns.asleep(10);

		// Listen for requests every so often
    await server.tick();
  }
}

// ------------------
// 3. Create a client

import { p, appRouter } from "router.ts";

export async function main(ns: NS) {
  const client = createProtocolClient(ns, {
    router: appRouter,

		// Change parameters of the communication to your liking
    timeout: 10 * 1000,
    retries: 2
  });

  const greeting = await client.greetings.greet("John");
}
*/