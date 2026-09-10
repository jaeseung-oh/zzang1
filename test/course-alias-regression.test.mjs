import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const enrollmentSource = fs.readFileSync(new URL('../lib/course/enrollment-service.ts', import.meta.url), 'utf8');
const certificateSource = fs.readFileSync(new URL('../app/certificate/page.tsx', import.meta.url), 'utf8');
const workerSource = fs.readFileSync(new URL('../worker.js', import.meta.url), 'utf8');

const criticalAliases = [
  '"dui-cbt-basic": defaultCourse.id',
  '"dui-documents": defaultCourse.id',
  '"dui-prevention-basic": defaultCourse.id',
  '"dui-cbt-advanced": DUI_CBT_ADVANCED_COURSE_ID'
];

test('DUI payment product aliases resolve to certificate course ids', () => {
  criticalAliases.forEach((alias) => {
    assert.ok(enrollmentSource.includes(alias), alias);
  });
});

test('certificate access compares canonical course ids instead of raw product ids', () => {
  assert.ok(certificateSource.includes('resolveCourseId, type EnrollmentRecord'));
  assert.ok(certificateSource.includes('const requested = resolveCourseId(courseId);'));
  assert.ok(certificateSource.includes('const documentCourseId = resolveCourseId(getEnrollmentDocumentCourseId(enrollment));'));
});
test("certificate issue worker uses canonical enrollment lookup without payment fallback", () => {
  const issueStart = workerSource.indexOf("async function handleCertificateIssue");
  const issueEnd = workerSource.indexOf("async function handleDocumentOutputLog", issueStart);
  const issueSource = workerSource.slice(issueStart, issueEnd);
  assert.ok(issueSource.includes("getCanonicalWorkerEnrollmentRecord(env, uid, canonicalCourseId)"));
  assert.equal(issueSource.includes("getActiveAdvancedEquivalentEnrollment(env, uid, firebaseUser.email || null)"), false);
  assert.equal(issueSource.includes("getPaidPurchaseForCertificate(env, uid, canonicalCourseId"), false);
  assert.equal(issueSource.includes("findRecentPortOneEntitlementForUser(env, firebaseUser, canonicalCourseId"), false);
});
test("certificate flag updates avoid purchases fallback reads", () => {
  const updateStart = workerSource.indexOf("async function updateCertificateFlags");
  const updateEnd = workerSource.indexOf("async function handleAdminCertificateIssue", updateStart);
  const updateSource = workerSource.slice(updateStart, updateEnd);
  assert.ok(updateSource.includes("getCanonicalWorkerEnrollmentRecord(env, uid, courseId)"));
  assert.equal(updateSource.includes("getPaidPurchaseForCertificate"), false);
});
