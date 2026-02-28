/**
 * Lightweight Result type (replaces @/llm/shared/result).
 * Follows the Ok/Err pattern similar to Rust's Result<T, E>.
 */

export type Ok<T> = { ok: true; value: T; error?: never };
export type Err<E> = { ok: false; error: E; value?: never };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok === true;
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => result.ok === false;
