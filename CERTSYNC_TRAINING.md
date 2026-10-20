# CERT-Synchrony training GUI

This branch adds `/sso` only when built with
`REACT_APP_CERTSYNC_TRAINING_ENABLED=true`. The default is off. Existing login,
routes and token storage remain available. This branch is CERT-Synchrony's own;
coordinate deployment with the colleague maintaining the CTI4BC instance on the VPS.

Build with the existing API prefix and the training flag:

```sh
docker build -t cti4bc-gui:certsync-training \
  --build-arg REACT_APP_CERTSYNC_TRAINING_ENABLED=true \
  --build-arg REACT_APP_API_URL=https://certsync-cti4bc.montimage.eu/api-backend .
```

At runtime set `CERTSYNC_TRAINING_ENABLED=true` and
`CERTSYNC_FRAME_ANCESTORS=https://certsync-platform.montimage.eu`. The nginx
entrypoint generates a framing header from this single HTTPS origin. When off,
its include is empty. Bind the published GUI port to loopback, or use only the
shared Docker network. Keep the API behind `/api-backend/` on the same origin.

## The platform's colours

`REACT_APP_CERTSYNC_THEME=true` (default **off**) adds the CERT-Synchrony
palette: the brand blue as the primary, slate neutrals, a card-coloured
sidebar and the same light and dark values, so the CTI4BC frame inside the
platform's Training tab does not look like a different product. Only the
colours change — the layout, the fonts and every behaviour stay CTI4BC's.

```sh
docker build -t cti4bc-gui:certsync-training \
  --build-arg REACT_APP_CERTSYNC_TRAINING_ENABLED=true \
  --build-arg REACT_APP_CERTSYNC_THEME=true \
  --build-arg REACT_APP_API_URL=https://certsync-cti4bc.montimage.eu/api-backend .
```

Without the flag the build is CTI4BC's own, unchanged: the palette's rules
(`src/theme/certsync-theme.css`) are scoped on a `data-certsync-theme`
attribute that the build only sets when the flag is on, so they are inert
otherwise. The stylesheet is always in the bundle — a stylesheet cannot be
left out of it at build time — and that is why the switch is an attribute
rather than a conditional import.

The token names keep saying "amber" (they are CTI4BC's vocabulary); the
colours they carry are the platform's. The CTI4BC logo keeps its own amber
hexagon: it is an image, and CTI4BC's own assets are not touched.

The platform opens `/sso?theme=dark#token=...`. The route removes the fragment,
POSTs the single-use JWT to `/api/certsync-training/sso/`, then stores
`accessToken` and `refreshToken` in **localStorage**, exactly like normal login,
and opens `/events`. Storage belongs to the CTI4BC origin, so the frame and a new
tab share that origin's session; it is not shared with other subdomains. Theme
is also retained. A refused token clears the old browser session and shows
“Open this from the platform's Training tab”. No JWT is written to a query
string, console or persistent browser storage. CTI4BC's returned access/refresh
tokens retain their existing localStorage storage policy.

Each newly mounted platform frame gets a new platform token. React StrictMode
reuses the **in-flight exchange promise** within a mounted sign-on route, avoiding
a second exchange of the same single-use JWT.

Training navigation shows Events and Shared Logs. The share dialog hides
organisation forwarding; the backend independently enforces organisation and
MISP destination restrictions. Admin sessions retain normal navigation.

```sh
npm ci --legacy-peer-deps
CI=true npm test -- --watchAll=false --runInBand
REACT_APP_CERTSYNC_TRAINING_ENABLED=true npm run build
```

The old Create React App “Learn React” placeholder failed before this work. It
now checks the normal login with its required theme provider. Three added tests
cover successful storage, StrictMode, rejected sign-on and a missing fragment.
Existing unrelated build warnings are recorded in the workspace implementation
report. No dependency versions were changed.

Rollback: rebuild `main` (or build this branch with the training flag false),
unset the runtime flag, and disable the platform's CTI4BC sign-on settings.
