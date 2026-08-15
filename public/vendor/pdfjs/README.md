# pdf.js, vendored — the LEGACY build

`pdf.min.mjs` and `pdf.worker.min.mjs` from [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) **4.10.38**, from its `legacy/build/` directory, unmodified. Licence: **Apache-2.0**, `LICENSE` beside them, compatible with zetizeti's AGPL-3.0.

## 🔴 Why the LEGACY build of 4.x, and not the current one

Shipped first with **6.2.108's standard build**, and a student could not open a single PDF on the day it went out. The error blamed password protection, which was my catch-all guessing; the real cause was that pdf.js 6 calls `Iterator.prototype.join`, and **iterator helpers reached Safari only in 18.2, in December 2024**. The link went out over WhatsApp, so students opened it on phones. Every PDF failed on any iOS older than that, regardless of what was in the file.

**6.2.108's own legacy build does not fix it** — it still calls `Iterator.prototype`. 4.10.38's legacy build does not, and bundles core-js for `Promise.withResolvers` and `structuredClone`, which is what "legacy" means here: transpiled and polyfilled for older engines.

The text-extraction API this project uses — `getTextContent()`, `items[].str`, `.transform`, `.width`, `.hasEOL` — is identical between 4.x and 6.x, so `pdfToText` needed no change.

⚠️ **Do not "upgrade" to the current pdfjs without checking `grep -c 'Iterator.prototype'` on the file you are about to vendor.** Newer is the wrong axis here; what matters is the oldest browser a student is holding.

## Why these are here rather than in `package.json`

They are not a runtime dependency and must never become one. **The PDF is read in the browser tab and never reaches the server** — the same path `parseTranscriptMd` uses to resume a critique from a saved file. Only extracted text travels, in the turn body, exactly as a paste always has. Adding `pdfjs-dist` to `package.json` would install roughly 10 MB into the image to serve two files only the client executes.

## Updating

```bash
cd /tmp && npm pack pdfjs-dist@<version> && tar -xzf pdfjs-dist-<version>.tgz
grep -c 'Iterator.prototype' package/legacy/build/pdf.min.mjs   # must be 0
cp package/legacy/build/pdf.min.mjs package/legacy/build/pdf.worker.min.mjs package/LICENSE <app>/public/vendor/pdfjs/
```

Then change the version here and `PDFJS_VERSION` in `public/index.html`. **Both files move together** — the worker refuses to load against a mismatched main build, and that failure reaches a student as a PDF that simply will not open.
