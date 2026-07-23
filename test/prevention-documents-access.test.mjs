import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/course/prevention-documents.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(js, { module, exports: module.exports, Set, String, Number, Date, console }, { filename: "prevention-documents.ts" });
const { getPreventionDocumentCategoryFromEnrollment, isPreventionDocumentsEnrollment } = module.exports;

test("paid DUI basic enrollment can open prevention documents", () => {
  const enrollment = { courseId: "dui-prevention-basic", productId: "basic", courseTitle: "음주운전 재범방지교육", amount: 49000 };
  assert.equal(isPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(getPreventionDocumentCategoryFromEnrollment(enrollment), "dui");
});

test("manual enrollment without payment amount can open prevention documents", () => {
  const enrollment = { courseId: "dui-prevention-basic", productId: "basic", courseTitle: "음주운전 재범방지교육", amount: null };
  assert.equal(isPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(getPreventionDocumentCategoryFromEnrollment(enrollment), "dui");
});

test("specific course id decides non-DUI document category even with generic basic product id", () => {
  const enrollment = { courseId: "violence-basic", productId: "basic", courseTitle: "폭력범죄 재범방지교육", amount: null };
  assert.equal(isPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(getPreventionDocumentCategoryFromEnrollment(enrollment), "violence");
});
