# pdf.js, vendored

`pdf.min.mjs` and `pdf.worker.min.mjs` from [pdfjs-dist](https://www.npmjs.com/package/pdfjs-dist) **6.2.108**, unmodified. Licence: **Apache-2.0**, `LICENSE` beside them. Apache-2.0 is compatible with zetizeti's AGPL-3.0, and the files are redistributed as they came.

## Why these are here rather than in `package.json`

They are not a runtime dependency and must never become one. **The PDF is read in the browser tab and never reaches the server** — the same path `parseTranscriptMd` already uses to resume a critique from a saved markdown file, with `FileReader` and no endpoint. That is what keeps the ephemeral pivot intact: a document a student opens is not something the service holds, because the service never sees the file at all. Only the extracted text travels, in the turn body, exactly as a paste always has.

Adding `pdfjs-dist` to `package.json` would install about 10 MB into the image to serve two files that only the client executes. So they are copied in and pinned, and `verification/vendor-pinned.test.mjs` fails if the version recorded here and the version in the file header ever disagree.

## Updating

```bash
cd /tmp && npm pack pdfjs-dist@<version> && tar -xzf pdfjs-dist-<version>.tgz
cp package/build/pdf.min.mjs package/build/pdf.worker.min.mjs package/LICENSE <app>/public/vendor/pdfjs/
```

Then change the version in this file and in `PDFJS_VERSION` in `public/index.html`, and run the tests. **Both files must move together** — the worker refuses to load against a mismatched main build, and the failure surfaces to a student as a PDF that simply will not open.
