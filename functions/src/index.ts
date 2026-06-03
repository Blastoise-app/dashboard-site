// Cloud Functions entry point — re-exports every deployable function.
export { beforeCreateUser } from "./onUserCreate.js";
export { syncSheetsScheduled } from "./syncSheets.js";
// NOTE: markReviewed is intentionally NOT exported until Phase 4 (the file does
// not exist yet — exporting it would break the tsc predeploy build).
