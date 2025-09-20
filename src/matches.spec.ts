import test from "ava"
import { lambda } from "./pattern.js"
import { matches, req_matches } from "./matches.js"

test("literal 1", t => t.true(matches("a", "a")))

test("partial 1", t => t.true(matches({ a: 1, b: 2 }, { })))
test("partial 2", t => t.true(matches({ a: 1, b: 2 }, { a: 1 })))
test("partial 3", t => t.true(matches({ a: 1, b: 2 }, { b: 2 })))
test("partial 4", t => t.true(matches({ a: 1, b: 2 }, { a: 1, b: 2 })))
test("partial 5", t => t.false(matches({ a: 1, b: 2 }, { a: 1, b: 2, c: 100 })))

test("lambda 1", t => req_matches(t, 112, lambda(_ => _ > 100 && Math.floor(Math.sqrt(_)) === 10)))

test("array 1", t => t.true(matches([1, 2, 3], [1, lambda<number>(x => (x % 2) === 0), 3])))
test("array 2", t => t.false(matches([1, 2], [1, lambda<number>(x => (x % 2) === 0), 3])))
test("array 3", t => t.false(matches([1, 2], [1, lambda<number>(x => (x % 2) === 1)])))
