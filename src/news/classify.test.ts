import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyOrchardNews, refineDraftCategory } from "./classify";

describe("classifyOrchardNews", () => {
  it("prioritises ringo over fruit", () => {
    assert.equal(classifyOrchardNews("りんご栽培の省力化", ""), "ringo");
  });

  it("uses nashi phrases instead of bare 梨", () => {
    assert.equal(classifyOrchardNews("日本なしの収穫", ""), "nashi");
    assert.equal(classifyOrchardNews("富士山の観光", ""), "general");
  });

  it("matches 富士りんご as ringo", () => {
    assert.equal(classifyOrchardNews("富士りんごの出荷", ""), "ringo");
  });

  it("refines yosoku with crop keywords", () => {
    assert.equal(refineDraftCategory("yosoku", "りんご黒星病の発生予察", ""), "ringo");
    assert.equal(refineDraftCategory("yosoku", "害虫調査のお知らせ", ""), "yosoku");
  });
});