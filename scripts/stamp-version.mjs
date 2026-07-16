// stamp-version.mjs — write the build's version (resolved live from git) to stdout as JSON.
// Called by make-caprover-tar.sh at tar time; its output is saved as app/version.json INSIDE the image,
// because production containers have no .git. Run from a checkout with .git present.
import { resolveVersion } from '../lib/version.mjs';

const v = resolveVersion();                       // in the build checkout → resolves from git
const stamp = { ...v, stampedAt: process.env.BUILD_TIME || null };
process.stdout.write(JSON.stringify(stamp));
