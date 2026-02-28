/**
 * Re-export the shared MoyinDb singleton from @moyin/vn-engine.
 * The database schema (v9) is defined once in the engine package
 * so that persistence functions and the web app share the exact same instance.
 */
export { MoyinDb, moyinDb, DB_SCHEMA_VERSION } from '@moyin/vn-engine'
