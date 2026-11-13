// Shared paths for the browser tests: where screenshots and generated files go, and the Excel library.
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '.out'); fs.mkdirSync(OUT, { recursive: true });
let XLSX_JS = process.env.PAISA_XLSX;
if (!XLSX_JS) { try { XLSX_JS = require.resolve('xlsx/dist/xlsx.full.min.js'); } catch (e) { XLSX_JS = null; } }
let XLSX_NODE = null;
try { XLSX_NODE = require.resolve('xlsx'); } catch (e) { if (XLSX_JS) XLSX_NODE = path.resolve(path.dirname(XLSX_JS), '..'); }
module.exports = { OUT, XLSX_JS, XLSX_NODE, URL: process.env.PAISA_URL || 'http://localhost:8767/' };
