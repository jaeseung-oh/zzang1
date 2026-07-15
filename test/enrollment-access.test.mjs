import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../worker.js', import.meta.url), 'utf8')
  .replace('export default {', 'const __defaultExport = {')
  .replace(/export \{ getEnrollmentAccessDecision, isFirestoreEnrollmentActiveRecord, normalizeEnrollmentSourceType \};\s*$/, '')
  + '\nglobalThis.__exports = { getEnrollmentAccessDecision, isFirestoreEnrollmentActiveRecord, normalizeEnrollmentSourceType };';
const context = { console, crypto: { subtle: {} }, TextEncoder, TextDecoder, URL, URLSearchParams, Date, Promise, Set, Map, Object, String, Number, Boolean, Array, Math, RegExp, Error };
vm.runInNewContext(source, context, { filename: 'worker.js' });
const { getEnrollmentAccessDecision, isFirestoreEnrollmentActiveRecord } = context.__exports;

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
