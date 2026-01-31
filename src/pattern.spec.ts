import test from "ava"
import { ERR_ARRAY_LENGTH_MISMATCH, ERR_FIELD_MISSING, ERR_FIELD_NOT_MISSING, fieldMissing, lambda, match, PatternMatchResult_Array_Error_LengthMismatch, PatternMatchResult_Lambda_Error, PatternMatchResult_PartialObj, PatternMatchResult_PartialObj_Error, PatternMatchResult_PartialObj_Success, PatternMatchResultError_PartialObj_FieldMissing, PatternMatchResultError_PartialObj_FieldNotMissing, PatternMatchResultType, subsets } from "./pattern.js"

test("literal 1", t => {
    const _ = match("a", "a")
    t.is(_.item, "a")
    t.is(_.pattern, "a")
    t.is(_.type, PatternMatchResultType.success)
})

test("partial 1", t => {
    const _ = <PatternMatchResult_PartialObj>match({ a: 1, b: 2 }, {})
    t.is(_.type, PatternMatchResultType.success)
    t.deepEqual(Object.keys(_.results), [])
})

test("partial 2", t => {
    const _ = <PatternMatchResult_PartialObj>match({ a: 1, b: 2 }, { a: 1 })
    t.is(_.type, PatternMatchResultType.success)
    t.deepEqual(Object.keys(_.results), ["a"])
})

test("partial 3", t => {
    const _ = <PatternMatchResult_PartialObj>match({ a: 1, b: 2 }, { b: 2 })
    t.is(_.type, PatternMatchResultType.success)
    t.deepEqual(Object.keys(_.results), ["b"])
})

test("partial 4", t => {
    const _ = <PatternMatchResult_PartialObj>match({ a: 1, b: 2 }, { a: 1, b: 2 })
    t.is(_.type, PatternMatchResultType.success)
    t.deepEqual(Object.keys(_.results), ["a", "b"])
})

test("partial 5", t => {
    const _ = <PatternMatchResult_PartialObj_Error>match({ a: 1, b: 2 }, { a: 1, b: 2, c: 100 })
    t.is(_.type, PatternMatchResultType.error)
    t.deepEqual(Object.keys(_.results), ["a", "b", "c"])
    t.deepEqual(_.errors, {
        c: <PatternMatchResultError_PartialObj_FieldMissing>{
            pattern: 100,
            message: ERR_FIELD_MISSING,
            item: undefined,
            type: PatternMatchResultType.error,
        }
    })
})

test("partial 6", t => {
    const _ = <PatternMatchResult_PartialObj_Success>match({ a: 1, b: 2 }, { a: 1, b: 2, c: fieldMissing })
    t.is(_.type, PatternMatchResultType.success)
    t.deepEqual(Object.keys(_.results), ["a", "b", "c"])
})

test("partial 7", t => {
    const _ = <PatternMatchResult_PartialObj_Error>match({ a: 1, b: 2, c: 100 }, { a: 1, b: 2, c: fieldMissing })
    t.is(_.type, PatternMatchResultType.error)
    t.deepEqual(Object.keys(_.results), ["a", "b", "c"])
    t.deepEqual(_.errors, {
        c: <PatternMatchResultError_PartialObj_FieldNotMissing>{
            pattern: fieldMissing,
            message: ERR_FIELD_NOT_MISSING,
            item: 100,
            type: PatternMatchResultType.error,
        }
    })
})

test("lambda 1", t => {
    const _ = match(112, lambda<number>(_ => _ > 100 && Math.floor(Math.sqrt(_)) === 10))
    t.is(_.type, PatternMatchResultType.success)
})

test("array 1", t => {
    const _ = match([1, 2, 3], [1, lambda<number>(x => (x % 2) === 0), 3])
    t.is(_.type, PatternMatchResultType.success)
})

test("array 2", t => {
    const _ = <PatternMatchResult_Array_Error_LengthMismatch>match([1, 2], [1, lambda<number>(x => (x % 2) === 0), 3])
    t.is(_.type, PatternMatchResultType.error)
    t.is(_.message, ERR_ARRAY_LENGTH_MISMATCH)
})

test("array 3", t => {
    const lambda_pattern = lambda<number>(x => (x % 2) === 1)
    const _ = <PatternMatchResult_PartialObj_Error>match([1, 2], [1, lambda_pattern])
    t.deepEqual(_.errors, {
        '1': <PatternMatchResult_Lambda_Error>{
            result: false,
            kind: "returned",
            type: PatternMatchResultType.error,
            item: 2,
            pattern: lambda_pattern,
        }
    })
})

test("subset 1", t => {
    const _ = match([1, 2, 3, 4], subsets([4, 2, 1]))
    t.is(_.type, PatternMatchResultType.success)
})

test("subset 2", t => {
    const _ = match([1, 2, 3, 4], subsets([4, 2, 1, 5]))
    t.is(_.type, PatternMatchResultType.error)
})

test("subset 3", t => {
    const _ = match([1, 2, 3, 4], subsets(["a"]))
    t.is(_.type, PatternMatchResultType.error)
})

test("subset 4", t => {
    const _ = match([1, 2, 3, 4], subsets([4, 2, 1, 4, 2, 1]))
    t.is(_.type, PatternMatchResultType.success)
})
