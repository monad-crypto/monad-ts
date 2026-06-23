# Productionization Checklist

Before publishing `@monad-crypto/eth_query` as production-ready:

- Add integration tests for each method, including field projection, relation inclusion, filters, ascending pagination, descending pagination, empty result sets, and malformed RPC responses against a production JSON-RPC server.
- Add ABI-aware wrapper actions from monad-exp/monad-data-poc#60, including `queryContractLogs`, `queryContractLogsWithPagination`, `queryContractTraces`, and `queryContractTracesWithPagination` for typed event/call filtering and decoding.
- Audit pagination edge cases, especially zero/one-row pages, inclusive block ranges, `latest`/`earliest` tags, and underflow when paginating descending from block `0`.
- Remove or justify all `@ts-expect-error` casts in response formatting.
- Decide whether `debug.ts` types belong in the public package or should be internalized/removed.
- Add examples for standalone actions and `queryActions(client)` in the README.
- Add package-level architecture/security documentation covering RPC trust, fixed method inventory, formatting behavior, and non-goals.
- Add a changeset for the first release once the package API is finalized.
