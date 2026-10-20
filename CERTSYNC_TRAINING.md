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
