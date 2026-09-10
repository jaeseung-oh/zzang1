import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(new URL("../lib/course/prevention-documents.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(js, { module, exports: module.exports, Set, String, Number, Date, console }, { filename: "prevention-documents.ts" });
const { getPreventionDocumentCategoryFromEnrollment, getPreventionDocumentsForCategory, getPreventionDocumentsForEnrollment, isAdvancedPreventionDocumentsEnrollment, isPreventionDocumentsEnrollment } = module.exports;

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

test("DUI CBT basic payment id opens exactly the basic DUI documents", () => {
  const enrollment = { courseId: "dui-prevention-basic", productId: "dui-cbt-basic", courseTitle: "음주운전 재범방지교육", amount: null };
  assert.equal(isPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(getPreventionDocumentCategoryFromEnrollment(enrollment), "dui");
  assert.equal(isAdvancedPreventionDocumentsEnrollment(enrollment), false);
  assert.equal(getPreventionDocumentsForEnrollment(enrollment).map((document) => document.id).join(","), "prevention-plan,drinking-action-plan,pledge");
});

test("specific course id decides non-DUI document category even with generic basic product id", () => {
  const enrollment = { courseId: "violence-basic", productId: "basic", courseTitle: "폭력범죄 재범방지교육", amount: null };
  assert.equal(isPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(getPreventionDocumentCategoryFromEnrollment(enrollment), "violence");
});


test("new prevention document categories resolve and expose three documents", () => {
  const cases = [
    ["fraud-basic", "fraud"],
    ["unlicensed-driving-basic", "unlicensed-driving"],
    ["hangover-driving-basic", "hangover-driving"],
    ["legal-compliance-awareness-basic", "legal-compliance-awareness"],
    ["prostitution-basic", "prostitution"],
  ];
  cases.forEach(([courseId, category]) => {
    const enrollment = { courseId, productId: courseId, courseTitle: courseId, amount: 49000 };
    assert.equal(isPreventionDocumentsEnrollment(enrollment), true, courseId);
    assert.equal(getPreventionDocumentCategoryFromEnrollment(enrollment), category, courseId);
    assert.equal(getPreventionDocumentsForCategory(category).length, 3, category);
  });
});


test("DUI CBT advanced payment id opens basic and advanced DUI documents", () => {
  const enrollment = { courseId: "dui-cbt-advanced", productId: "dui-cbt-advanced", courseTitle: "인지행동기반 재발방지교육 심화과정", amount: null };
  assert.equal(isPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(getPreventionDocumentCategoryFromEnrollment(enrollment), "dui");
  assert.equal(isAdvancedPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(getPreventionDocumentsForEnrollment(enrollment).map((document) => document.id).join(","), "prevention-plan,drinking-action-plan,pledge,dui-education-review");
});

test("counseling DUI enrollment is treated as advanced prevention documents access", () => {
  const enrollment = { courseId: "dui-cbt-advanced", productId: "dui-cbt-counseling", productTitle: "심리상담 종합과정", amount: 199000 };
  assert.equal(isPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(isAdvancedPreventionDocumentsEnrollment(enrollment), true);
  assert.equal(getPreventionDocumentsForEnrollment(enrollment).map((document) => document.id).join(","), "prevention-plan,drinking-action-plan,pledge,dui-education-review");
  assert.equal(getPreventionDocumentCategoryFromEnrollment(enrollment), "dui");
});
