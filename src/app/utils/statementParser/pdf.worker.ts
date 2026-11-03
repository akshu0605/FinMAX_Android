// PDF.js calls Promise.withResolvers in its worker context too. Keep this
// polyfill ahead of the PDF.js worker module for older Android WebViews.
import '../../../polyfills';
import 'pdfjs-dist/build/pdf.worker.mjs';
