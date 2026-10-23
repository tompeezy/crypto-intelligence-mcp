# Voluntary discovery-only agent test

This is an optional 5-10 minute test for one independent AI-agent operator.
Participation is not a purchase, testimonial request, subscription or commitment.
You may stop without submitting feedback. No compensation or service credit is offered.

## Consent and privacy first

Choose whether to participate and whether to share a redacted result. Write your
own actual research question **locally before the test**. Do not send it to a tool
that only accepts a product ID. Do not include private research, employer/client
names, IP addresses, wallet addresses, keys, account credentials or payment data.
A generic category/summary is sufficient for optional feedback. No automatic
upload or persistent participant identifier is used.

If you share on GitHub, your public account identity will be visible under
GitHub's policies. Public issues are not a private support channel. Keep the
full transcript local; share only specifically chosen, redacted fields. CI will
not infer consent from a page view, tool invocation or anonymous HTTP request.

## One bounded interaction

1. Record how you actually found CI: Registry, README, invitation, or another route.
   Do not claim organic discovery if you arrived through the invitation.
2. Follow the public [README installation instructions](README.md#install-the-mcpb-release).
   Use the exact published v0.1.0 MCPB and verify its SHA-256/inventory. Do not
   rebuild or run an unrelated package. Configure your normal local stdio MCP host;
   never add wallet/environment secrets. Tell us only host/runtime version if useful.
3. Ask your own agent to inspect available tools and call `ci_discover({})` once.
   Save the actual tool call, time and response locally. Note what it understands
   about scope, $0.01/$0.05 prices, deadlines and disabled availability.
4. If your task fits an existing offer, call `ci_request_claim` once with that
   product ID. If your question is outside the two scopes, record **unsupported
   task** instead of forcing a product match. Do not add new arguments or tools.
5. An optional repeat of the same readiness call tests repeat-request behavior.
   Maximum three catalog GETs for this procedure: discovery, one preflight, one
   optional repeat. Stop on error or changed availability; no automatic retry.
6. Record the actual response and your agent's own interpretation locally. A
   blocked readiness result is **no delivered answer**, not a verified claim,
   contradiction or classifier verdict. Never label metadata as proof.
7. Decide whether even this limited interaction was useful, what information was
   missing, and whether you would use CI again for your actual task. A negative
   answer is useful feedback. Return intent is not evidence of willingness to pay.

No quote, purchase, signature, wallet, settlement or financial operation belongs
in this test. No institutional or current-production result is offered. If you
need a real verification that this interface cannot deliver, stop and report that
limitation; do not seek access to CI's private repository or internal systems.

## Optional report

Use [FEEDBACK.md](FEEDBACK.md) locally. If you explicitly choose to share a
redacted version, open one issue in this public adapter repository. You can also
simply decline to share; CI must then record participation as unobserved, not
invent a result. Do not post to unrelated communities or send private material.

CI should label results as operator-reported unless a consented transcript was
actually reviewed. An invitation-led run is different from organic discovery.
Owner/staff tests, synthetic scripts and monitoring are not independent usage.
This procedure does not establish payment demand, audited performance or general
LLM accuracy, and it must never trigger automatic payment activation.

## Documentation versus released bytes

This guide is documentation under review. It does not replace the v0.1.0 artifact,
change either MCP tool, renew evidence, publish a package or activate any offer.
