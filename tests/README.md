# Frontend Playwright tests

Run `npm run test:coverage`. The command runs Chromium tests and enforces the
existing overall 80% line threshold in `.nycrc.json`. Coverage covers frontend
source; mocks do not replace the application's HTTP service or exclude code.

## Shared setup

Every spec imports `test` and `expect` from `testSetup.ts`. Its automatic `api`
fixture installs a fresh `ApiMock` before the test runs. No backend is required:
known service and factory requests are fulfilled in the browser context, while
unknown API or external requests are aborted and fail the test at teardown.
External images receive a local placeholder. Service workers are disabled so
requests cannot bypass interception. The local Vite server serves frontend files.

`apiMock.ts` provides typed diner, admin and franchisee accounts, pizzas,
franchises, stores, and orders. Mock mutations change only the current test's
state. Set explicit error flags before the action that should fail. Use
`api.matching(method, path)` to assert request bodies, query parameters, counts,
and authorization. Unknown methods/endpoints fall through to the request guard;
add an explicit mock when introducing a new API interaction.

`helpers.ts` shares three readable operations: login, selecting an order, and
paying through delivery. `api.signedIn(page, user)` seeds a token and the mock
session; authentication tests instead exercise the real login/registration UI.
Each spec retains its own outcome assertions. Tests use role/placeholder locators,
automatic waiting, and fresh state rather than fixed delays or test ordering.

## What each test proves

| Test | Purpose |
| --- | --- |
| Login and logout | Login submits credentials, stores a token and shows initials; logout calls DELETE and removes the token. |
| Invalid login | Wrong credentials display the server message without creating a session. |
| Registration | The login-to-registration link works; submitted account data creates a signed-in diner. |
| Duplicate registration | A rejected registration displays its error and links back to login. |
| Saved session | Startup restores the user and sends the bearer token. |
| Expired session | A rejected startup lookup removes the stale token. |
| Checkout through login | Selected store and pizzas survive the authentication redirect; totals and the submitted order match; delivery shows the confirmation. |
| Payment failure and cancellation | A single-pizza bill displays correctly; rejected payment shows its message; cancellation retains the cart and store. |
| Successful verification | The factory receives the delivered JWT; the dialog shows its payload, closes, and ordering again starts a fresh cart. |
| Invalid signature | A factory rejection displays the invalid-pizza message. |
| Verification network failure | An intentionally aborted, intercepted verification request displays the invalid-pizza message. |
| Empty diner history | The account's name, email and role appear with the first-order prompt. |
| Populated diner history | Order ID, rounded price and date appear, along with multiple roles and a franchise association. |
| Admin pagination/filtering | Next/previous controls and filter results reflect the requested page, limit and name. |
| Admin franchise management | Cancel does not create/delete; creation sends the entered data; confirmed closure removes the franchise. |
| Admin store closure | The selected store is named in confirmation and removed after DELETE. |
| Franchisee store management | Revenue appears; create sends store data; cancellation sends no mutation; confirmed closure removes the store. |
| Visitor franchise page | Franchise information links to the nested login route. |
| About, History and unknown page | Each route renders its expected heading. |
| Service and factory documentation | Each source renders its mocked description, request example and response. |
| Request guard | An isolated context proves unmocked service, factory, same-origin and unexpected-origin API calls abort and are recorded. |

The guard test deliberately inspects violations in its own context. Application
tests always retain the automatic zero-violation assertion.

## Verified result

`npm run test:coverage` on October 3, 2026: **24 tests passed**, with
**99.05% overall frontend line coverage** (313 of 316 lines). The existing
80% coverage requirement passed. No application test recorded an unmocked
backend request.
