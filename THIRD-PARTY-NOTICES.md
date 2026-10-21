# Third-party notices

Runtime packages bundled without modifying their code:

| Component                    | Version | Upstream                                               | Applicable notices                                 |
| ---------------------------- | ------- | ------------------------------------------------------ | -------------------------------------------------- |
| @modelcontextprotocol/server | 2.3.1   | https://github.com/modelcontextprotocol/typescript-sdk | Apache-2.0/MIT transition; documentation CC-BY-4.0 |
| @modelcontextprotocol/core   | 2.3.1   | https://github.com/modelcontextprotocol/typescript-sdk | Apache-2.0/MIT transition; documentation CC-BY-4.0 |
| zod                          | 4.6.7   | https://github.com/colinhacks/zod                      | MIT; Copyright (c) 2025 Colin McDonnell            |

Each dependency's complete upstream LICENSE is preserved verbatim in the MCPB
under node_modules/<package>/LICENSE. The SDK's transition notice expressly
retains MIT for contributions without relicensing consent; this release does not
relicense any SDK contributions. SDK documentation authors are the Model Context
Protocol contributors; upstream repository links above identify the sources.
Documentation, where included, remains CC-BY-4.0 and unchanged, with its full
legal terms at https://creativecommons.org/licenses/by/4.0/legalcode .
No additional upstream NOTICE file was present in the distributed runtime packages.
Dependency tests/benchmarks, source maps and declaration files are omitted by the
packaging process; runtime code, copyright, attribution and license notices are
retained. Source code remains available from the upstream repositories above.
Build/test tools are not bundled; their npm lockfile records identify their own
packages and licenses, which are not replaced by the adapter's Apache grant.
