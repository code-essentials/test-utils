import { match, Pattern, PatternMatchResultType } from "./pattern.js";

export interface WithTrueAssert {
    true(ok: boolean, message?: string): ok is true
}

export function req_matches<T>(t: WithTrueAssert, item: T, pattern: Pattern<T>): boolean {
    const result = match(item, pattern)
    const ok = result.type === PatternMatchResultType.success

    t.true(ok, String(result))

    return ok
}

export function matches<T>(item: T, pattern: Pattern<T>): boolean {
    return match(item, pattern).type === PatternMatchResultType.success
}
