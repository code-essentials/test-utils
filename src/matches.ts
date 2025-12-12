import { match, Pattern, PatternMatchResultType } from "./pattern.js";
import chalk from 'chalk'

export interface WithTrueAssert {
    true(ok: boolean, message?: string): ok is true
}

export interface WithPassFail {
    pass(message?: string): void
    fail(message?: string): void
}

export function req_matches<T>(t: WithTrueAssert | WithPassFail, item: T, pattern: Pattern<T>): boolean {
    const result = match(item, pattern)
    const ok = result.type === PatternMatchResultType.success
    const message = ok ? undefined :
        `${chalk.red('actual')}, ${chalk.green('expected')}\n${chalk.red(JSON.stringify(result))}\n${chalk.green(JSON.stringify(pattern))}`
    
    if ('pass' in t) {
        if (ok)
            t.pass()
        else
            t.fail(message)
    }
    else {
        t.true(ok, ...(message ? [message] : []))
    }

    return ok
}

export function matches<T>(item: T, pattern: Pattern<T>): boolean {
    return match(item, pattern).type === PatternMatchResultType.success
}
