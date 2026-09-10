import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../worker.js', import.meta.url), 'utf8')
  .replace('export default {', 'const __defaultExport = {')
  .replace(/export \{ getEnrollmentAccessDecision, isFirestoreEnrollmentActiveRecord, normalizeEnrollmentSourceType \};\s*$/, '')
  + '\nglobalThis.__exports = { getEnrollmentAccessDecision, getActiveDuplicateEnrollmentDecision, isFirestoreEnrollmentActiveRecord, normalizeEnrollmentSourceType, resolveCanonicalCourseId, isStreamUidAllowedForCourse, getIncludedBaseProductForManualGrant, APPLICATION_PRODUCTS, isCourseEntitlementEquivalent, isValidCompletedPaymentForEntitlement };';
const context = { console, crypto: { subtle: {} }, TextEncoder, TextDecoder, URL, URLSearchParams, Date, Promise, Set, Map, Object, String, Number, Boolean, Array, Math, RegExp, Error };
vm.runInNewContext(source, context, { filename: 'worker.js' });
const { getEnrollmentAccessDecision, getActiveDuplicateEnrollmentDecision, isFirestoreEnrollmentActiveRecord, resolveCanonicalCourseId, isStreamUidAllowedForCourse, getIncludedBaseProductForManualGrant, APPLICATION_PRODUCTS, isCourseEntitlementEquivalent, isValidCompletedPaymentForEntitlement } = context.__exports;

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


test('pending PAYMENT enrollment is denied and cannot behave as active access', () => {
  const enrollment = { ...base, sourceType: 'PAYMENT', paymentStatus: 'pending', paymentId: 'pay_pending', orderId: 'pay_pending' };
  const decision = getEnrollmentAccessDecision(enrollment, 'user_1', 'dui-prevention-basic');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'INACTIVE_ENROLLMENT');
  assert.equal(isFirestoreEnrollmentActiveRecord(enrollment), false);
});

test('ready PAYMENT enrollment is denied and cannot behave as active access', () => {
  const enrollment = { ...base, sourceType: 'PAYMENT', paymentStatus: 'ready', paymentId: 'pay_ready', orderId: 'pay_ready' };
  const decision = getEnrollmentAccessDecision(enrollment, 'user_1', 'dui-prevention-basic');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'INACTIVE_ENROLLMENT');
  assert.equal(isFirestoreEnrollmentActiveRecord(enrollment), false);
});

test('awaiting_deposit PAYMENT enrollment is denied and cannot behave as active access', () => {
  const enrollment = { ...base, sourceType: 'PAYMENT', paymentStatus: 'awaiting_deposit', paymentId: 'pay_vbank', orderId: 'pay_vbank' };
  const decision = getEnrollmentAccessDecision(enrollment, 'user_1', 'dui-prevention-basic');
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'INACTIVE_ENROLLMENT');
  assert.equal(isFirestoreEnrollmentActiveRecord(enrollment), false);
});

test('MANUAL enrollment allows course access without payment fields', () => {
  const enrollment = { ...base, sourceType: 'MANUAL', paymentStatus: null, paymentId: null, orderId: null, adminGranted: true };
  assert.equal(getEnrollmentAccessDecision(enrollment, 'user_1', 'dui-prevention-basic').allowed, true);
});

test('legacy adminGranted enrollment is treated as manual access', () => {
  const enrollment = { ...base, sourceType: '', paymentStatus: null, paymentId: null, orderId: null, adminGranted: true };
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



test('manual grant products keep explicit basic and advanced plan metadata', () => {
  const expected = {
    'dui-documents': 'basic',
    'dui-cbt-advanced': 'advanced',
    'violence-basic': 'basic',
    'violence-advanced': 'advanced',
    'gambling-basic': 'basic',
    'gambling-advanced': 'advanced',
    'sexual-offense-basic': 'basic',
    'sexual-offense-advanced': 'advanced',
    'prostitution-basic': 'basic',
    'prostitution-advanced': 'advanced',
    'drug-basic': 'basic',
    'drug-advanced': 'advanced',
    'drug-addiction-basic': 'basic',
    'drug-addiction-premium': 'premium',
    'digital-crime-basic': 'basic',
    'digital-crime-advanced': 'advanced',
    'fraud-basic': 'basic',
    'fraud-advanced': 'advanced',
    'unlicensed-driving-basic': 'basic',
    'unlicensed-driving-advanced': 'advanced',
    'hangover-driving-basic': 'basic',
    'hangover-driving-advanced': 'advanced',
    'legal-compliance-awareness-basic': 'basic',
    'legal-compliance-awareness-advanced': 'advanced'
  };
  Object.entries(expected).forEach(([productId, planId]) => {
    assert.equal(APPLICATION_PRODUCTS[productId]?.planId, planId, productId);
  });
});

test('manual advanced grants can include the matching base product for every advanced course', () => {
  const expectedBase = {
    'dui-cbt-advanced': 'dui-cbt-basic',
    'violence-advanced': 'violence-basic',
    'gambling-advanced': 'gambling-basic',
    'sexual-offense-advanced': 'sexual-offense-basic',
    'prostitution-advanced': 'prostitution-basic',
    'drug-advanced': 'drug-basic',
    'drug-addiction-premium': 'drug-addiction-basic',
    'digital-crime-advanced': 'digital-crime-basic',
    'fraud-advanced': 'fraud-basic',
    'unlicensed-driving-advanced': 'unlicensed-driving-basic',
    'hangover-driving-advanced': 'hangover-driving-basic',
    'legal-compliance-awareness-advanced': 'legal-compliance-awareness-basic'
  };
  Object.entries(expectedBase).forEach(([advancedProductId, baseProductId]) => {
    assert.equal(getIncludedBaseProductForManualGrant(advancedProductId)?.productId, baseProductId, advancedProductId);
  });
});

test('basic courses cannot request CBT stream videos', () => {
  ['dui-prevention-basic', 'violence-basic', 'gambling-basic', 'sexual-offense-basic', 'prostitution-basic', 'drug-addiction-relapse-prevention', 'digital-crime-basic', 'fraud-basic', 'unlicensed-driving-basic', 'hangover-driving-basic', 'legal-compliance-awareness-basic'].forEach((courseId) => {
    const productId = courseId === 'drug-addiction-relapse-prevention' ? 'drug-addiction-basic' : courseId;
    assert.equal(isStreamUidAllowedForCourse('7c452891a700328cdb8f56cb39260970', courseId, { productId }), false, courseId);
    assert.equal(isStreamUidAllowedForCourse('afa89d104a50e779ee12112f1ec59655', courseId, { productId }), false, courseId);
  });
});

test('advanced courses can request CBT stream videos', () => {
  ['dui-cbt-advanced', 'violence-advanced', 'gambling-advanced', 'sexual-offense-advanced', 'prostitution-advanced', 'digital-crime-advanced', 'fraud-advanced', 'unlicensed-driving-advanced', 'hangover-driving-advanced', 'legal-compliance-awareness-advanced'].forEach((courseId) => {
    assert.equal(isStreamUidAllowedForCourse('7c452891a700328cdb8f56cb39260970', courseId, { productId: courseId }), true, courseId);
    assert.equal(isStreamUidAllowedForCourse('afa89d104a50e779ee12112f1ec59655', courseId, { productId: courseId }), true, courseId);
  });
  assert.equal(isStreamUidAllowedForCourse('7c452891a700328cdb8f56cb39260970', 'drug-addiction-relapse-prevention', { productId: 'drug-addiction-premium' }), true);
  assert.equal(isStreamUidAllowedForCourse('afa89d104a50e779ee12112f1ec59655', 'drug-addiction-relapse-prevention', { productId: 'drug-addiction-premium' }), true);
  assert.equal(isStreamUidAllowedForCourse('7c452891a700328cdb8f56cb39260970', 'drug-addiction-relapse-prevention', { productId: 'drug-addiction-basic' }), false);
});

test('basic course videos remain available to basic courses', () => {
  assert.equal(isStreamUidAllowedForCourse('22193ede6a22e4b27b2dc1d3ecce214c', 'dui-prevention-basic'), true);
  assert.equal(isStreamUidAllowedForCourse('9e7a8bca74cc08b48622a4dcf8df070f', 'drug-addiction-basic'), true);
  assert.equal(isStreamUidAllowedForCourse('c3ee448bc45d30d329b76a89e2d1a547', 'fraud-basic'), true);
  assert.equal(isStreamUidAllowedForCourse('f581475c91de7f8574391ec5daebc008', 'unlicensed-driving-basic'), true);
  assert.equal(isStreamUidAllowedForCourse('0a451904c6baea91ab32155f1df3e748', 'hangover-driving-basic'), true);
  assert.equal(isStreamUidAllowedForCourse('a2b66d1b575d82d361f7680ec1e7e48b', 'legal-compliance-awareness-basic'), true);
});

test('new prevention product aliases resolve to independent course products', () => {
  assert.equal(resolveCanonicalCourseId({ categoryId: 'fraud-prevention' }), 'fraud-basic');
  assert.equal(resolveCanonicalCourseId({ productId: 'fraud-advanced' }), 'fraud-advanced');
  assert.equal(resolveCanonicalCourseId({ categoryId: 'unlicensed-driving-prevention' }), 'unlicensed-driving-basic');
  assert.equal(resolveCanonicalCourseId({ productId: 'unlicensed-driving-advanced' }), 'unlicensed-driving-advanced');
  assert.equal(resolveCanonicalCourseId({ categoryId: 'hangover-driving-prevention' }), 'hangover-driving-basic');
  assert.equal(resolveCanonicalCourseId({ productId: 'hangover-driving-advanced' }), 'hangover-driving-advanced');
  assert.equal(resolveCanonicalCourseId({ categoryId: 'legal-compliance-awareness' }), 'legal-compliance-awareness-basic');
  assert.equal(resolveCanonicalCourseId({ categoryId: 'prostitution-prevention' }), 'prostitution-basic');
  assert.equal(resolveCanonicalCourseId({ productId: 'legal-compliance-awareness-advanced' }), 'legal-compliance-awareness-advanced');
  assert.equal(resolveCanonicalCourseId({ productId: 'prostitution-advanced' }), 'prostitution-advanced');
});


test("counseling product aliases resolve to included advanced courses", () => {
  const expected = {
    "dui-cbt-counseling": "dui-cbt-advanced",
    "violence-advanced-counseling": "violence-advanced",
    "gambling-advanced-counseling": "gambling-advanced",
    "sexual-offense-advanced-counseling": "sexual-offense-advanced",
    "prostitution-advanced-counseling": "prostitution-advanced",
    "drug-advanced-counseling": "drug-advanced",
    "drug-addiction-premium-counseling": "drug-addiction-relapse-prevention",
    "digital-crime-advanced-counseling": "digital-crime-advanced",
    "fraud-advanced-counseling": "fraud-advanced",
    "unlicensed-driving-advanced-counseling": "unlicensed-driving-advanced",
    "hangover-driving-advanced-counseling": "hangover-driving-advanced",
    "reckless-retaliatory-driving-advanced-counseling": "reckless-retaliatory-driving-advanced",
    "defamation-insult-advanced-counseling": "defamation-insult-advanced",
    "legal-compliance-awareness-advanced-counseling": "legal-compliance-awareness-advanced"
  };
  Object.entries(expected).forEach(([productId, courseId]) => {
    assert.equal(resolveCanonicalCourseId({ productId }), courseId, productId);
  });
});


test('all counseling products resolve as advanced-equivalent products', () => {
  const counselingProducts = Object.values(APPLICATION_PRODUCTS).filter((product) => String(product.productId || '').endsWith('-counseling'));
  assert.equal(counselingProducts.length >= 12, true);
  counselingProducts.forEach((product) => {
    const resolvedCourseId = resolveCanonicalCourseId({ productId: product.productId, courseId: product.courseId, canonicalCourseId: product.canonicalCourseId });
    assert.equal(Boolean(resolvedCourseId), true, product.productId);
    assert.equal(product.includesCbtCourse, true, product.productId);
    assert.equal(product.amount, 199000, product.productId);
  });
});


test('payment confirmation writes only the purchased course enrollment', () => {
  const confirmStart = source.indexOf('async function handlePortOnePaymentConfirm');
  const confirmEnd = source.indexOf('async function handleAdminPaymentResync', confirmStart);
  assert.notEqual(confirmStart, -1);
  assert.notEqual(confirmEnd, -1);
  const confirmSource = source.slice(confirmStart, confirmEnd);
  assert.equal(confirmSource.includes('ensureIncluded'), false);
  assert.equal(confirmSource.includes('includedWithProductId'), false);
});


test('stream token gate trusts payment-backed access decisions without requiring a persisted enrollment object', () => {
  const streamStart = source.indexOf('async function handleStreamToken');
  const streamEnd = source.indexOf('async function handleStreamDirectUpload', streamStart);
  assert.notEqual(streamStart, -1);
  assert.notEqual(streamEnd, -1);
  const streamSource = source.slice(streamStart, streamEnd);
  assert.equal(streamSource.includes('streamAccessDecision.allowed && isFirestoreEnrollmentActiveRecord(streamEnrollment)'), false);
  assert.equal(streamSource.includes('Boolean(streamAccessDecision.allowed)'), true);
});




test('dui counseling payment is equivalent to dui advanced entitlement', () => {
  const paidCounseling = {
    uid: 'user_1',
    userId: 'user_1',
    productId: 'dui-cbt-counseling',
    courseId: 'dui-cbt-counseling',
    categoryId: 'dui',
    planId: 'counseling',
    productTitle: '심리상담 종합과정',
    paymentStatus: 'paid',
    status: 'paid',
    amount: 199000
  };
  assert.equal(isCourseEntitlementEquivalent(paidCounseling, 'dui-cbt-advanced'), true);
  assert.equal(isValidCompletedPaymentForEntitlement(paidCounseling, 'dui-cbt-advanced'), true);
});

test('existing certificate issue path returns the stored certificate number for unlimited reissue', () => {
  const start = source.indexOf('async function handleCertificateIssue');
  const end = source.indexOf('async function handleDocumentOutputLog', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const certificateSource = source.slice(start, end);
  assert.equal(certificateSource.includes('existing?.certificateNo || existing?.issueNumber'), true);
  assert.equal(certificateSource.includes('alreadyIssued: true'), true);
  assert.equal(certificateSource.includes("existingDocumentType !== 'attendance'"), true);
  assert.equal(certificateSource.includes('CERTIFICATE_EXISTING_READ_DELAYED'), false);
  assert.equal(certificateSource.includes('issuing-without-existing-read'), true);
});

test('counseling products can request included advanced stream videos', () => {
  assert.equal(isStreamUidAllowedForCourse('7c452891a700328cdb8f56cb39260970', 'dui-cbt-advanced', { productId: 'dui-cbt-counseling' }), true);
  assert.equal(isStreamUidAllowedForCourse('afa89d104a50e779ee12112f1ec59655', 'dui-cbt-advanced', { productId: 'dui-cbt-counseling' }), true);
  const advancedCourses = ['violence-advanced', 'gambling-advanced', 'sexual-offense-advanced', 'digital-crime-advanced', 'fraud-advanced', 'unlicensed-driving-advanced', 'hangover-driving-advanced'];
  advancedCourses.forEach((courseId) => {
    assert.equal(isStreamUidAllowedForCourse('7c452891a700328cdb8f56cb39260970', courseId, { productId: courseId + '-counseling' }), true, courseId);
  });
  assert.equal(isStreamUidAllowedForCourse('7c452891a700328cdb8f56cb39260970', 'drug-addiction-relapse-prevention', { productId: 'drug-addiction-premium-counseling' }), true);
});

test('/api/enrollments/me uses canonical enrollment source without payment fallback', () => {
  const checkStart = source.indexOf('async function checkCourseEntitlement');
  const checkEnd = source.indexOf('async function getWorkerCourseAccessDecision', checkStart);
  assert.notEqual(checkStart, -1);
  assert.notEqual(checkEnd, -1);
  const checkSource = source.slice(checkStart, checkEnd);
  assert.ok(checkSource.includes('getCanonicalWorkerEnrollmentRecord(env, uid, normalizedCourseId)'));
  assert.equal(checkSource.includes('getPaymentLikeRecordsForEntitlement'), false);
  assert.equal(checkSource.includes('findRecentPortOneEntitlementForUser'), false);
  assert.equal(checkSource.includes('grantCourseAccess(env'), false);
  assert.ok(checkSource.includes('paymentQueryCount: 0'));
});

test('frontend verified enrollment lookup does not run Firestore fallback after Worker failure', () => {
  const frontendSource = fs.readFileSync(new URL('../lib/course/enrollment-service.ts', import.meta.url), 'utf8');
  const lookupStart = frontendSource.indexOf('export async function getVerifiedUserEnrollments');
  const lookupEnd = frontendSource.indexOf('export async function getVerifiedActiveUserEnrollments', lookupStart);
  assert.notEqual(lookupStart, -1);
  assert.notEqual(lookupEnd, -1);
  const lookupSource = frontendSource.slice(lookupStart, lookupEnd);
  assert.equal(lookupSource.includes('getFirestoreEnrollmentFallback'), false);
  assert.equal(lookupSource.includes('getUserEnrollment(user.uid'), false);
  assert.ok(lookupSource.includes('throw error'));
});

