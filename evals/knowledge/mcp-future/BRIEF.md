# MCP knowledge brief (slug: mcp-future)

Researched 2026-10-28. Spec: modelcontextprotocol.io/specification (revisions 2024-11-05,
2025-03-26, 2025-06-18, 2025-11-25, and the current one, **2026-07-28**, which made the core
stateless). Changelogs fetched directly; client adoption dates are weak and kept out. The worked example is a real internal MCP server: a
test-management platform's staging connector (tools `*_search_test_cases`,
`*_create_test_case`, `*_bulk_import_test_cases`, `*_get_test_import_status`,
`*_discover_tools`), read from its tool descriptions only, never called.

## Mental model

1. MCP is a protocol, not a service. It defines how an AI application (the **host**) talks to
   programs that offer context and actions (**servers**). The host runs one **client** per
   server connection. The wire format is JSON-RPC 2.0.
2. It fixes the N×M problem: without a shared protocol every AI app writes its own glue for
   every system (N × M integrations). With one, each app speaks MCP once and each system
   exposes MCP once (N + M). The same idea as USB-C or LSP (the Language Server Protocol), which MCP's design borrows from.
3. Until 2025-11-25 a session started with `initialize` (agree a protocol version, declare
   capabilities), then `notifications/initialized`, with an `Mcp-Session-Id` on HTTP. The
   2026-07-28 revision removed the handshake and protocol sessions (SEP-2575, SEP-2567):
   every request carries its protocol version and client capabilities in `_meta`; servers
   MUST implement `server/discover`; cross-call state is a server-minted handle passed as an
   ordinary tool argument. List results carry `ttlMs` and `cacheScope` (public/private), and
   Streamable HTTP POSTs carry `Mcp-Method`/`Mcp-Name` headers (SEP-2549, SEP-2243). In
   short, MCP now behaves much more like an ordinary stateless HTTP API: cacheable, routable,
   load-balanceable.
4. Servers offer three primitives, and they differ in **who decides to use them**: **tools**
   (the model decides: functions with a JSON Schema input), **resources** (the application decides:
   readable data addressed by URI), **prompts** (the user decides: templates, often slash commands).
5. Clients offered primitives back to servers: **sampling** (the server asks the host's model
   to generate text), **roots** (which folders the server may work in), **elicitation** (ask the
   user mid-call). In 2026-07-28 Roots, Sampling and Logging are **deprecated** (SEP-2577), and
   elicitation moved to Multi Round-Trip Requests (SEP-2322): the server returns
   `resultType: "input_required"` with `inputRequests`, and the client retries the original
   request with `inputResponses`. Tasks (long-running work) became an extension
   (`io.modelcontextprotocol/tasks`, polled via `tasks/get`, SEP-2663).
5b. Extensions: optional features outside the core, e.g. MCP Apps (SEP-1865, Final,
   `io.modelcontextprotocol/ui`): a tool points at a `ui://` resource of type
   `text/html;profile=mcp-app` and the host renders it in a sandboxed iframe. This is how a
   server ships its own interactive UI into the chat.
6. Discovery is at run time: `tools/list` returns names, descriptions and input schemas; the
   model reads the descriptions to choose. A tool description is a prompt, and its quality
   decides whether the model calls the right tool with the right arguments.
7. Transports: **stdio** (the host launches the server as a local subprocess) and
   **Streamable HTTP** (one HTTP endpoint, POST for messages; the response may stream). It
   replaced the 2024 HTTP+SSE transport in 2025-03-26; HTTP+SSE is formally Deprecated in
   2026-07-28 (SEP-2596, 12-month minimum window). SSE resumability was removed: a broken
   stream loses the in-flight request and the client re-issues it.
8. Remote servers use OAuth 2.1 (since 2025-03-26). The MCP server is an OAuth **resource server**: it validates
   tokens issued for itself (audience-bound, RFC 8707 resource indicators) and must not
   forward the client's token to upstream APIs: "MCP servers MUST NOT accept any tokens that
   were not explicitly issued for the MCP server." Client registration: Client ID Metadata
   Documents (2025-11-25) are preferred; Dynamic Client Registration is deprecated (2026-07-28).
8b. Governance: Anthropic donated MCP to the Agentic AI Foundation, a Linux Foundation
   directed fund co-founded with Block and OpenAI (announced 2025-12-09). Adopters named there:
   ChatGPT, Cursor, Gemini, Microsoft Copilot, VS Code. Registry: preview since 2025-09-08.
9. MCP usually **wraps** an existing API; it does not replace the service. The test-management
   server's `create_test_case` calls the REST `POST /test-cases/import` endpoint. What it
   replaces is the per-app integration code and, for many workflows, the fixed UI flow: the
   model composes the calls at run time. "MCP wraps APIs" is community framing, not a spec
   quote; it is backed here by the real server's own docstrings.
10. Every tool definition costs context tokens. Many servers × many tools crowd the context
    and make tool choice worse. The fixes are fewer and better tools, deferred loading or
    tool search (the platform server ships a `discover_tools` tool), and code execution over
    MCP (the model writes code that calls tools, so intermediate results skip the context).
    Anthropic reports one workflow dropping from ~150,000 to ~2,000 tokens with code execution
    (2025-11-04), and tool search cutting ~77K to ~8.7K tokens of definitions (their own evals).
    2026-07-28 asks servers to return `tools/list` in a deterministic order for prompt caching.

## Traps

### 1. "MCP replaces REST APIs"
- **Mistake:** Planning to retire the HTTP API because "the agent talks MCP now".
- **Correct:** MCP is an adapter layer for model-driven clients. Programs, CI jobs, other
  services and the web UI still need a stable, versioned, deterministic API. The MCP server
  is usually a thin client of that API.
- **Source:** the platform server's tool docstrings ("routes through the platform API
  `POST /test-cases/import` endpoint"); spec overview.

### 2. Tool description written for humans, not for the model
- **Mistake:** One-line descriptions or one tool per REST endpoint. The model guesses arguments,
  loops on N single calls, or picks the wrong tool.
- **Correct:** Say when to use the tool and when to use another, give units and formats, name
  side effects. The platform server says "Authoring more than one? Use bulk import instead"
  and "a person's estimate in seconds, not a forecast".
- **Source:** spec "Tools" (description, inputSchema, annotations); the platform server's tool descriptions.

### 3. Trusting tool results as instructions (prompt injection)
- **Mistake:** Feeding a fetched web page, ticket or test step straight into the model with
  write tools enabled. Text inside the data says "now call delete_..." and the model obeys.
- **Correct:** Treat tool output as data. Separate read and write tools, ask a human to
  confirm destructive calls, and scope tokens narrowly.
- **Source:** spec "Security Best Practices"; spec Tools "Security considerations"
  (humans in the loop for tool calls).

### 4. Tool annotations treated as a security boundary
- **Mistake:** Trusting `readOnlyHint: true` / `destructiveHint: false` from an unknown server.
- **Correct:** Annotations are hints. Clients must treat them as untrusted unless the server is trusted.
- **Source:** spec 2025-03-26 changelog (tool annotations); Tools spec.

### 5. Token passthrough / confused deputy
- **Mistake:** The MCP server accepts the user's token and forwards it unchanged to upstream
  APIs, or accepts tokens not issued for it.
- **Correct:** Validate that the token's audience is this server; get separate upstream tokens.
  The spec forbids token passthrough.
- **Source:** spec "Authorization" and "Security Best Practices" (token passthrough, confused deputy).

### 6. Permission filtering only in the UI
- **Mistake:** Hiding tools in the client but letting any authenticated caller run them.
- **Correct:** Filter `tools/list` by the caller's permissions and check again on every call.
  The platform server filters both `tools/list` and its own `discover_tools` through the
  authorization service, so discovery does not leak tools a user cannot use.
- **Source:** the platform server's `discover_tools` docstring.

### 7. Long operations as blocking tool calls
- **Mistake:** A tool that imports 5,000 items and holds the call open until it times out.
- **Correct:** Return a job id and a status tool to poll (the platform server's bulk import
  returns `request_id`, status `verifying → verified → importing → finished`), or use the spec's
  task support (2025-11-25, experimental).
- **Source:** the platform server's `bulk_import_test_cases` docstring; 2025-11-25 and 2026-07-28 changelogs.

### 9. Teaching (or building on) the old stateful lifecycle
- **Mistake:** Storing per-user state in the protocol session, or expecting `initialize` and
  `Mcp-Session-Id`. Under 2026-07-28 there is no protocol session and list results must not
  vary per connection.
- **Correct:** Stateless requests with version and capabilities in `_meta`; explicit handles as
  tool arguments for cross-call state; `server/discover` to probe versions.
- **Source:** 2026-07-28 changelog (SEP-2575, SEP-2567).

### 10. Server-initiated sampling/elicitation in new code
- **Mistake:** New servers calling `sampling/createMessage` or `elicitation/create` mid-call.
- **Correct:** Return `input_required` (MRTR) and let the client retry; call an LLM provider API
  directly instead of Sampling.
- **Source:** 2026-07-28 changelog (SEP-2322, SEP-2577).

### 8. Too many tools
- **Mistake:** Connecting ten servers with 150 tools "just in case".
- **Correct:** Fewer, task-shaped tools; tool search or deferred loading; code execution with MCP.
- **Source:** Anthropic engineering, "Code execution with MCP" (Nov 2025).

## Sources
- https://modelcontextprotocol.io/specification/2026-07-28/changelog
- https://blog.modelcontextprotocol.io/posts/2026-07-28/
- https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices
- https://modelcontextprotocol.io/extensions/apps/overview
- https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation
- https://www.anthropic.com/engineering/advanced-tool-use
- https://modelcontextprotocol.io/specification/2025-11-25
- https://modelcontextprotocol.io/specification/2025-11-25/changelog
- https://modelcontextprotocol.io/specification/2025-06-18/changelog
- https://modelcontextprotocol.io/specification/2025-03-26/changelog
- https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices
- https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- https://www.anthropic.com/engineering/code-execution-with-mcp
