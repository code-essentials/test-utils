export type Pattern<T = any> =
    | PatternLiteral<T>
    | PatternPartialObj<T>
    | PatternArray<T>
    | PatternLambda<T>

export enum PatternMatchResultType {
    success = "success",
    error = "error",
}

export interface PatternMatchResult<T = any, Pattern_ extends Pattern<T> = Pattern<T>, Type extends PatternMatchResultType = PatternMatchResultType> {
    readonly type: Type
    readonly item: T
    readonly pattern: Pattern_
}

export type PatternMatchResultSuccess<T = any, Pattern_ extends Pattern<T> = Pattern<T>> = PatternMatchResult<T, Pattern_, PatternMatchResultType.success>
export type PatternMatchResultError<T = any, Pattern_ extends Pattern<T> = Pattern<T>> = PatternMatchResult<T, Pattern_, PatternMatchResultType.error>

export type PatternLiteral<T> = T

export const fieldMissing = Symbol("field missing")

export type PatternPartialObj<T> = T extends object ? { [K in keyof T]?: Pattern<T[K]> | typeof fieldMissing } : never

interface PatternMatchResult_PartialObj_Base<T extends object = object, Pattern_ extends PatternPartialObj<T> = PatternPartialObj<T>, Type extends PatternMatchResultType = PatternMatchResultType> extends PatternMatchResult<T, Pattern_, Type> {
    results: {
        [K in ((keyof Pattern_) & (keyof T))]: PatternMatchResult<T[K], Pattern_[K] extends Pattern<T[K]> ? Pattern_[K] : Pattern<T[K]>>
    }
}

export interface PatternMatchResult_PartialObj_Success<T extends object = object, Pattern_ extends PatternPartialObj<T> = PatternPartialObj<T>> extends PatternMatchResult_PartialObj_Base<T, Pattern_, PatternMatchResultType.success> {
}

export interface PatternMatchResult_PartialObj_Error<T extends object = object, Pattern_ extends PatternPartialObj<T> = PatternPartialObj<T>> extends PatternMatchResult_PartialObj_Base<T, Pattern_, PatternMatchResultType.error> {
    errors: {
        [K in ((keyof Pattern_) & (keyof T))]?: PatternMatchResultError<T[K], Pattern_[K] extends Pattern<T[K]> ? Pattern_[K] : Pattern<T[K]>>
    }
}

export type PatternMatchResult_PartialObj<T extends object = object, Pattern_ extends PatternPartialObj<T> = PatternPartialObj<T>> =
    | PatternMatchResult_PartialObj_Success<T, Pattern_>
    | PatternMatchResult_PartialObj_Error<T, Pattern_>

export const ERR_FIELD_MISSING = "field missing"
export const ERR_FIELD_NOT_MISSING = "field not missing"
export interface PatternMatchResultError_PartialObj_FieldMissing extends PatternMatchResultError {
    message: typeof ERR_FIELD_MISSING
}
export interface PatternMatchResultError_PartialObj_FieldNotMissing extends PatternMatchResultError {
    message: typeof ERR_FIELD_NOT_MISSING
}

export type PatternArray<T> =
    T extends any[] ? (
        PatternPartialObj<T> & Pattern<T[keyof T & number]>[] & { [K in keyof T as K extends number ? K : never]: Pattern<T[K]> }
    ) :
    never

export const ERR_ARRAY_LENGTH_MISMATCH = "length mismatch"
export interface PatternMatchResult_Array_Error_LengthMismatch<T extends any[] = any[], Pattern_ extends PatternArray<T> = PatternArray<T>> extends PatternMatchResultError<T, Pattern_> {
    message: typeof ERR_ARRAY_LENGTH_MISMATCH
}

export type PatternMatchResult_Array<T extends any[] = any[], Pattern_ extends PatternArray<T> = PatternArray<T>> =
    | PatternMatchResult_PartialObj<T, Pattern_>
    | PatternMatchResult_Array_Error_LengthMismatch<T, Pattern_>

type ItemPatternMatches<ItemT = any, ItemPatternT extends Pattern<ItemT> = Pattern<ItemT>> = {
    item_pattern: ItemPatternT,
    matches: PatternMatchResult<ItemT, ItemPatternT>[]
    matched: boolean
}[]

export class ArraySubsetNoMatch<ItemT = any, ItemPatternT extends Pattern<ItemT> = Pattern<ItemT>> extends AggregateError {
    constructor(
        readonly item_pattern_matches: ItemPatternMatches<ItemT, ItemPatternT>,
    ) {
        super(
            item_pattern_matches,
            ArraySubsetNoMatch.ERR_MSG,
        )
    }

    static readonly ERR_MSG = "no item was found in array satisfying pattern element"
}

export function subsets<const T extends any[] = any[], const PatternT extends PatternArray<T> = PatternArray<T>>(pattern: PatternT): Pattern<T> {
    return lambda(array => {
        const item_pattern_matches = pattern.map<ItemPatternMatches[number]>(item_pattern => {
            const matches = array.map(item => match(item, item_pattern))
            const matched = matches.some(({ type }) => type === PatternMatchResultType.success)

            return { item_pattern, matches, matched }
        })

        if (item_pattern_matches.some(({ matched }) => !matched))
            throw new ArraySubsetNoMatch(item_pattern_matches)

        return true
    })
}

const patternLambdaKey = Symbol("pattern lambda")
export type PatternLambda<T> = {
    [patternLambdaKey]: (item: T) => any
}

interface PatternMatchResult_Lambda_Base<T, Pattern_ extends PatternLambda<T>, Type extends PatternMatchResultType> extends PatternMatchResult<T, Pattern_, Type> {
    result: any
}

export interface PatternMatchResult_Lambda_Success<T = any, Pattern_ extends PatternLambda<T> = PatternLambda<T>> extends PatternMatchResult_Lambda_Base<T, Pattern_, PatternMatchResultType.success>, PatternMatchResultSuccess<T, Pattern_> {
}

export interface PatternMatchResult_Lambda_Error<T = any, Pattern_ extends PatternLambda<T> = PatternLambda<T>> extends PatternMatchResult_Lambda_Base<T, Pattern_, PatternMatchResultType.error>, PatternMatchResultError<T, Pattern_> {
    kind: "thrown" | "returned"
}

export type PatternMatchResult_Lambda<T = any, Pattern_ extends PatternLambda<T> = PatternLambda<T>> =
    | PatternMatchResult_Lambda_Success<T, Pattern_>
    | PatternMatchResult_Lambda_Error<T, Pattern_>

export function match<T, Pattern_ extends Pattern<T>>(item: T, pattern: Pattern_): PatternMatchResult<T, Pattern_> {
    if (pattern_lambda_is(pattern))
        return match_lambda(item, pattern)

    if (Array.isArray(item) && Array.isArray(pattern))
        return match_array(item, <Pattern_ & PatternArray<T>>pattern)

    if (typeof item === 'object' && item && typeof pattern === 'object' && pattern && pattern_partialObj_is(item, pattern))
        return match_partialObj(item, pattern)
    
    return match_literal(item, <Pattern_ & PatternLiteral<T>>pattern)
}

function match_literal<T, Pattern_ extends PatternLiteral<T>>(item: T, pattern: Pattern_): PatternMatchResult<T, Pattern_> {
    const type = (item === pattern) ?
        PatternMatchResultType.success :
        PatternMatchResultType.error
    
    return {
        type,
        item,
        pattern,
    }
}

function match_array<T extends any[], Pattern_ extends PatternArray<T>>(item: T, pattern: Pattern_): PatternMatchResult_Array<T, Pattern_> {
    if (item.length !== pattern.length) {
        return <PatternMatchResult_Array_Error_LengthMismatch<T, Pattern_>>{
            type: PatternMatchResultType.error,
            message: ERR_ARRAY_LENGTH_MISMATCH,
            item,
            pattern,
        }
    }

    return match_partialObj(item, pattern)
}

function pattern_partialObj_is<T>(item: T, _pattern: Pattern<T>): _pattern is PatternPartialObj<T> {
    if (typeof item !== 'object' || item === null)
        return false

    return true
}

function match_partialObj<T extends object, Pattern_ extends PatternPartialObj<T>>(item: T, pattern: Pattern_): PatternMatchResult_PartialObj<T, Pattern_> {
    const results = <PatternMatchResult_PartialObj<T, Pattern_>["results"]>{}
    type K = keyof T & keyof Pattern_

    for (const [key, pattern_key] of <[K, Pattern][]><unknown>Object.entries(pattern)) {
        if (pattern_key === fieldMissing) {
            if (key in item) {
                results[key] = <PatternMatchResultError_PartialObj_FieldNotMissing>{
                    item: item[key],
                    pattern: pattern_key,
                    type: PatternMatchResultType.error,
                    message: ERR_FIELD_NOT_MISSING,
                }
            }
            else {
                results[key] = {
                    item: undefined!,
                    pattern: pattern_key,
                    type: PatternMatchResultType.success,
                }
            }
        }
        else {
            if (key in item)
                results[key] = match(item[key], pattern_key)
            else {
                results[key] = <PatternMatchResultError_PartialObj_FieldMissing>{
                    type: PatternMatchResultType.error,
                    item: undefined,
                    pattern: pattern_key,
                    message: ERR_FIELD_MISSING,
                }
            }
        }
    }

    const errors_filtered = Object.entries(results).filter((o): o is [string, PatternMatchResultError] => (<PatternMatchResult>o[1]).type === PatternMatchResultType.error)
    const errors = <PatternMatchResult_PartialObj_Error<T, Pattern_>["errors"]>Object.fromEntries(errors_filtered)

    const base = {
        pattern,
        item,
        results,
    } satisfies Partial<PatternMatchResult_PartialObj_Base<T, Pattern_, PatternMatchResultType>>

    return errors_filtered.length === 0 ?
        <PatternMatchResult_PartialObj_Success<T, Pattern_>>{
            ...base,
            type: PatternMatchResultType.success,
        } :
        <PatternMatchResult_PartialObj_Error<T, Pattern_>>{
            ...base,
            type: PatternMatchResultType.error,
            errors,
        }
}

function pattern_lambda_is<T, Pattern_ extends Pattern<T>>(pattern_untyped: Pattern_): pattern_untyped is PatternLambda<T> & Pattern_ {
    return typeof pattern_untyped === 'object' && pattern_untyped && patternLambdaKey in pattern_untyped
}

function match_lambda<T, Pattern_ extends PatternLambda<T>>(item: T, pattern: Pattern_): PatternMatchResult_Lambda<T, Pattern_> {
    try {
        const result = pattern[patternLambdaKey](item)
        if (result) {
            return <PatternMatchResult_Lambda_Success<T, Pattern_>>{
                type: PatternMatchResultType.success,
                pattern,
                item,
                result,
            }
        }
        else {
            return <PatternMatchResult_Lambda_Error<T, Pattern_>>{
                type: PatternMatchResultType.error,
                pattern,
                item,
                result,
                kind: "returned",
            }
        }
    }
    catch (error) {
        return <PatternMatchResult_Lambda_Error<T, Pattern_>>{
            type: PatternMatchResultType.error,
            pattern,
            item,
            result: error,
            kind: "thrown",
        }
    }
}

export const lambda = <T>(lambda: (item: T) => boolean): Pattern<T> => ({
    [patternLambdaKey]: lambda
}) satisfies PatternLambda<T>

export const eq = <T>(x: T) => lambda<T>(o => o === x)
export const neq = <T>(x: T) => lambda<T>(o => o !== x)

export const gt = (x: number) => lambda<number>(o => o > x)
export const gte = (x: number) => lambda<number>(o => o >= x)
export const lt = (x: number) => lambda<number>(o => o < x)
export const lte = (x: number) => lambda<number>(o => o <= x)
