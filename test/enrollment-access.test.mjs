import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../worker.js', import.meta.url), 'utf8')
  .replace('export default {', 'const __defaultExport = {')
  .replace(/export \{ getEnrollmentAccessDecision, isFirestoreEnrollmentActiveRecord, normalizeEnrollmentSourceType \};\s*$/, '')
  + '\nglobalThis.__exports = { getEnrollmentAccessDecision, getActiveDuplicateEnrollmentDecision, isFirestoreEnrollmentActiveRecord, normalizeEnrollmentSourceType, resolveCanonicalCourseId };';
const context = { console, crypto: { subtle: {} }, TextEncoder, TextDecoder, URL, URLSearchParams, Date, Promise, Set, Map, Object, String, Number, Boolean, Array, Math, RegExp, Error };
vm.runInNewContext(source, context, { filename: 'worker.js' });
const { getEnrollmentAccessDecision, getActiveDuplicateEnrollmentDecision, isFirestoreEnrollmentActiveRecord, resolveCanonicalCourseId } = context.__exports;

const base = {
  userId: 'user_1',
  uid: 'user_1',
  courseId: 'dui-prevention-basic',
  status: 'active',
  enrollmentStatus: 'active',
  accessStatus: 'active',
  isActive: true,
  startsAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2099-01-01T00:00:00.000Z'
};

test('PAYMENT enrollment allows course access', () => {
  const enrollment = { ...base, sourceType: 'PAYMENT', paymentStatus: 'paid', paymentId: 'pay_1', orderId: 'pay_1' };
  assert.equal(getEnrollmentAccessDecision(enrollment, 'user_1', 'dui-prevention-basic').allowed, true);
  assert.equal(isFirestoreEnrollmentActiveRecord(enrollment), true);
});

test('MANUAL enrollment allows course access without payment fields', () => {
  const enrollment = { ...base, sourceType: 'MANUAL', paymentStatus: null, paymentId: null, orderId: null, adminGranted: true };
  assert.equal(getEnrollmentAccessDecision(enrollment, 'user_1', 'dui-prevention-basic').allowed, true);
});

test('different courseId is denied', () => {
  const enrollment = { ...base, sourceType: 'MANUAL' };
  const decision = getEnrollmentAccessDecision(enrollment, 'user_1', 'violence-basic');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'COURSE_MISMATCH');
});

test('expired enrollment is denied', () => {
  const enrollment = { ...base, sourceType: 'PAYMENT', paymentStatus: 'paid', expiresAt: '2020-01-01T00:00:00.000Z' };
  const decision = getEnrollmentAccessDecision(enrollment, 'user_1', 'dui-prevention-basic');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'EXPIRED');
});

test('inactive enrollment is denied', () => {
  const enrollment = { ...base, sourceType: 'MANUAL', isActive: false };
  const decision = getEnrollmentAccessDecision(enrollment, 'user_1', 'dui-prevention-basic');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'INACTIVE_ENROLLMENT');
});


test('drug product aliases resolve to the shared canonical course', () => {
  assert.equal(resolveCanonicalCourseId({ productId: 'drug-addiction-basic' }), 'drug-addiction-relapse-prevention');
  assert.equal(resolveCanonicalCourseId({ productId: 'drug-addiction-premium' }), 'drug-addiction-relapse-prevention');
});

test('drug basic enrollment blocks only same product and allows independent premium purchase', () => {
  const enrollment = {
    ...base,
    courseId: 'drug-addiction-relapse-prevention',
    canonicalCourseId: 'drug-addiction-relapse-prevention',
    productId: 'drug-addiction-basic',
    sourceType: 'PAYMENT',
    paymentStatus: 'paid'
  };
  assert.equal(getActiveDuplicateEnrollmentDecision(enrollment, 'user_1', 'drug-addiction-relapse-prevention', 'drug-addiction-basic').blocked, true);
  assert.equal(getActiveDuplicateEnrollmentDecision(enrollment, 'user_1', 'drug-addiction-relapse-prevention', 'drug-addiction-premium').blocked, false);
});

test('drug premium enrollment blocks basic because premium includes basic content', () => {
  const enrollment = {
    ...base,
    courseId: 'drug-addiction-relapse-prevention',
    canonicalCourseId: 'drug-addiction-relapse-prevention',
    productId: 'drug-addiction-premium',
    sourceType: 'PAYMENT',
    paymentStatus: 'paid'
  };
  const decision = getActiveDuplicateEnrollmentDecision(enrollment, 'user_1', 'drug-addiction-relapse-prevention', 'drug-addiction-basic');
  assert.equal(decision.blocked, true);
  assert.equal(decision.reason, 'PREMIUM_ALREADY_INCLUDES_BASIC');
});


test('digital crime product aliases resolve to independent course products', () => {
  assert.equal(resolveCanonicalCourseId({ categoryId: 'digital-crime' }), 'digital-crime-basic');
  assert.equal(resolveCanonicalCourseId({ productId: 'digital-crime-basic' }), 'digital-crime-basic');
  assert.equal(resolveCanonicalCourseId({ productId: 'digital-crime-advanced' }), 'digital-crime-advanced');
});

test('digital crime basic enrollment does not block advanced purchase', () => {
  const enrollment = {
    ...base,
    courseId: 'digital-crime-basic',
    productId: 'digital-crime-basic',
    sourceType: 'PAYMENT',
    paymentStatus: 'paid'
  };
  assert.equal(getActiveDuplicateEnrollmentDecision(enrollment, 'user_1', 'digital-crime-basic', 'digital-crime-basic').blocked, true);
  assert.equal(getActiveDuplicateEnrollmentDecision(enrollment, 'user_1', 'digital-crime-advanced', 'digital-crime-advanced').blocked, false);
});
