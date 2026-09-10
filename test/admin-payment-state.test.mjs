import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const helperSource = fs.readFileSync(new URL('../lib/admin/payment-state.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleShim = { exports: {} };
new Function('exports', 'module', compiled)(moduleShim.exports, moduleShim);
const {
  getMemberPaymentState,
  getPaymentStatusText,
  chooseCanonicalPaymentRecord,
  isPaidRecord,
} = moduleShim.exports;

const adminSource = fs.readFileSync(new URL('../app/admin/_components/admin-page.tsx', import.meta.url), 'utf8');
const workerSource = fs.readFileSync(new URL('../worker.js', import.meta.url), 'utf8');

test('CASE 1 payment paid renders as 결제완료', () => {
  assert.equal(getMemberPaymentState([{ paymentStatus: 'paid', approvedAt: '2026-08-27T01:00:00.000Z' }], []), '결제완료');
});

test('CASE 2 failed then retry paid renders as 결제완료', () => {
  const rows = [{ paymentStatus: 'failed', failedAt: '2026-08-27T01:00:00.000Z' }, { paymentStatus: 'paid', approvedAt: '2026-08-27T01:05:00.000Z' }];
  assert.equal(getMemberPaymentState(rows, []), '결제완료');
});

test('CASE 3 attempt only renders as 결제시도', () => {
  assert.equal(getMemberPaymentState([{ paymentStatus: 'pending', createdAt: '2026-08-27T01:00:00.000Z' }], []), '결제시도');
});

test('CASE 4 failed only renders as 결제실패', () => {
  assert.equal(getMemberPaymentState([{ paymentStatus: 'failed', failedAt: '2026-08-27T01:00:00.000Z' }], []), '결제실패');
});

test('CASE 5 no payment records renders as 미결제 only after data is loaded', () => {
  assert.equal(getMemberPaymentState([], [], { loaded: true }), '미결제');
  assert.equal(getMemberPaymentState([], [], { loaded: false }), '로딩 중');
});

test('CASE 6 paid plus older failed log keeps 결제완료', () => {
  assert.equal(getMemberPaymentState([{ paymentStatus: 'paid', approvedAt: '2026-08-27T01:05:00.000Z' }], [{ type: 'portone_confirm_failed' }]), '결제완료');
});

test('CASE 7 paid is not downgraded by later pending or failed records for the same key', () => {
  const paid = { id: 'pay_1', paymentId: 'pay_1', paymentStatus: 'paid', approvedAt: '2026-08-27T01:00:00.000Z', recordSource: 'payments' };
  const laterFailed = { id: 'pay_1', paymentId: 'pay_1', paymentStatus: 'failed', failedAt: '2026-08-27T01:10:00.000Z', recordSource: 'orders' };
  assert.equal(chooseCanonicalPaymentRecord(paid, laterFailed), paid);
  assert.equal(getMemberPaymentState([paid, laterFailed], []), '결제완료');
});

test('CASE 8 legacy paid records using approvedAt or receiptUrl render as 결제완료', () => {
  assert.equal(isPaidRecord({ status: '', approvedAt: '2026-07-21T03:00:00.000Z' }), true);
  assert.equal(getMemberPaymentState([{ receiptUrl: 'https://receipt.example', createdAt: '2026-07-21T03:00:00.000Z' }], []), '결제완료');
});

test('CASE 9 admin users list uses worker dataset and does not keep client-side payment fan-out queries', () => {
  assert.ok(adminSource.includes('/api/admin/member-dataset?'));
  assert.ok(!adminSource.includes('getAdminRowsByFields(db, "payments", ["uid", "userId"], uids)'));
  assert.ok(!adminSource.includes('getAdminRowsByFields(db, "purchases", ["uid", "userId"], uids)'));
  assert.ok(!adminSource.includes('getAdminRowsByFields(db, "orders", ["uid", "userId"], uids)'));
  assert.ok(adminSource.includes('getMemberPaymentState(bundle.payments, bundle.paymentLogs, { loaded: true })'));
});

test('CASE 10 refund or cancelled records render as separate refund/cancel states', () => {
  assert.equal(getPaymentStatusText({ paymentStatus: 'refunded', refundedAt: '2026-08-27T01:00:00.000Z' }), '환불완료');
  assert.equal(getPaymentStatusText({ paymentStatus: 'cancelled', cancelledAt: '2026-08-27T01:00:00.000Z' }), '결제취소');
});


test('CASE 11 legacy success shapes still render as 결제완료', () => {
  assert.equal(getMemberPaymentState([{ paymentState: '결제완료', amount: 99000 }], []), '결제완료');
  assert.equal(getMemberPaymentState([{ status: 'DONE', amount: 99000 }], []), '결제완료');
  assert.equal(getMemberPaymentState([{ rawResponse: { status: 'PAID' }, amount: 99000 }], []), '결제완료');
  assert.equal(getMemberPaymentState([{ completedAt: '2026-08-27T01:00:00.000Z', paidAmount: 99000 }], []), '결제완료');
});

test('CASE 12 pending failed refund shapes are not upgraded to 결제완료', () => {
  assert.equal(isPaidRecord({ paymentStatus: 'pending', amount: 99000, receiptUrl: 'https://receipt.example' }), false);
  assert.equal(isPaidRecord({ paymentStatus: 'failed', paidAmount: 99000, completedAt: '2026-08-27T01:00:00.000Z' }), false);
  assert.equal(isPaidRecord({ paymentState: '환불완료', paidAmount: 99000, completedAt: '2026-08-27T01:00:00.000Z' }), false);
});

test('CASE 13 admin CRM matches member bundle by uid and email without client-side fan-out reads', () => {
  assert.ok(adminSource.includes('function matchesCrmIdentity'));
  assert.ok(adminSource.includes('buyerUid'));
  assert.ok(adminSource.includes('const payments = getAllPaymentRecords(data).filter((row) => matchesCrmIdentity(row, identity));'));
  assert.ok(adminSource.includes('const bundle = getUserCrmBundle(user, ctx.data);'));
});

test('verified payment success writes admin summary for future low-read admin lists', () => {
  assert.ok(workerSource.includes('adminPaymentSummary: buildAdminUserPaymentSummary(paymentRecord, nowIso)'));
  assert.ok(workerSource.includes("paymentStatus: 'paid'"));
});

test('CASE 14 admin CRM table renders final payment status from paymentState', () => {
  assert.ok(adminSource.includes('label: "최종 결제현황"'));
  assert.ok(adminSource.includes('key: "paymentState", label: "최종 결제현황"'));
  assert.ok(!adminSource.includes('label: "최종 결제시도 상태"'));
});

test('CASE 15 admin CRM payment filters use the same paymentState shown in the table', () => {
  assert.ok(adminSource.includes('if (filter === "결제: 결제완료") return row.paymentState === "결제완료";'));
  assert.ok(adminSource.includes('if (filter === "결제: 미결제") return row.paymentState === "미결제";'));
});

test('CASE 16 admin users CRM does not fetch read-heavy completion documents for the list view', () => {
  const usersConfigStart = workerSource.indexOf('users: {');
  const paymentsConfigStart = workerSource.indexOf('payments: {');
  const usersConfig = workerSource.slice(usersConfigStart, paymentsConfigStart);
  assert.ok(usersConfig.includes("relatedLimit: 100"));
  assert.ok(usersConfig.includes("payments: ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail', 'customerEmail', 'buyerEmail']"));
  assert.ok(usersConfig.includes("enrollments: ['uid', 'userId', 'firebaseUid', 'customerUid', 'buyerUid', 'email', 'userEmail']"));
  assert.ok(!usersConfig.includes('courseProgress'));
  assert.ok(!usersConfig.includes('certificates'));
  assert.ok(!usersConfig.includes('documentOutputLogs'));
});

test('CASE 17 admin CRM list removes noisy completion/progress columns', () => {
  const usersViewStart = adminSource.indexOf('function UsersView');
  const filterStart = adminSource.indexOf('function filterUserCrm');
  const usersView = adminSource.slice(usersViewStart, filterStart);
  assert.ok(!usersView.includes('label: "수료일자"'));
  assert.ok(!usersView.includes('label: "결제 횟수"'));
  assert.ok(!usersView.includes('label: "결제시간"'));
});

test('CASE 18 admin CRM cache key is bumped after payment matching changes', () => {
  assert.ok(adminSource.includes('resetedu:admin-dataset:v15'));
});

test('CASE 19 admin users CRM includes the same recent payment ledgers as payment management', () => {
  const usersConfigStart = workerSource.indexOf('users: {');
  const paymentsConfigStart = workerSource.indexOf('payments: {');
  const usersConfig = workerSource.slice(usersConfigStart, paymentsConfigStart);
  assert.ok(usersConfig.includes("recent: [['users', 'createdAt desc'], ['payments', 'createdAt desc'], ['purchases', 'createdAt desc'], ['orders', 'createdAt desc'], ['enrollments', 'createdAt desc']]"));
});

test('CASE 20 admin users dataset attaches server-side payment summaries to user rows', () => {
  assert.ok(workerSource.includes('function attachAdminPaymentSummariesToUsers'));
  assert.ok(workerSource.includes("if (view === 'users') {"));
  assert.ok(workerSource.includes('attachAdminPaymentSummariesToUsers(dataset);'));
  assert.ok(workerSource.includes('adminPaymentSummary: buildAdminUserPaymentSummary(canonical'));
});

test('CASE 21 admin users dataset reads user profile documents by auth uid for birth date and phone', () => {
  assert.ok(workerSource.includes('async function getUserProfileRowsByDocumentIds'));
  assert.ok(workerSource.includes("firestoreGetDataOrNull(env, 'users', uid)"));
  assert.ok(workerSource.includes("recordSource: 'users:batchGet'"));
});

test('CASE 22 checkout and payment confirmation persist phone number for CRM fallback', () => {
  const checkoutSource = fs.readFileSync(new URL('../app/checkout/checkout-content.tsx', import.meta.url), 'utf8');
  const successSource = fs.readFileSync(new URL('../app/payment/success/page.tsx', import.meta.url), 'utf8');
  assert.ok(checkoutSource.includes('phoneNumber: buyerPhone.trim() || null'));
  assert.ok(successSource.includes('phoneNumber: pending?.phoneNumber || pending?.buyerPhone || pending?.customerPhone || null'));
  assert.ok(workerSource.includes('const phoneNumber = String(body?.phoneNumber || body?.buyerPhone || body?.customerPhone'));
  assert.ok(workerSource.includes('rawResponse?.customer?.phoneNumber'));
});


test('CASE 23 Supabase member ledger stays within worker subrequest limits and falls back to Firestore users profile', () => {
  assert.ok(workerSource.includes('getUserProfileRowsByDocumentIds(env, uids, { limit: 200 })'));
  assert.ok(workerSource.includes('const profileByUid = new Map((profiles || []).map((profile) => [getOperationalUid(profile) || profile.id, profile]))'));
  assert.ok(workerSource.includes('const mergedMembers = members || []'));
  assert.ok(workerSource.includes('getUserProfileRowsByDocumentIds(env, uids, { limit: 200 })'));
  assert.ok(workerSource.includes('const displayPhone = member.phone || getAdminProfilePhone(member) || getAdminProfilePhone(profile)'));
  assert.ok(workerSource.includes('birth_date: displayBirthDate'));
  assert.ok(workerSource.includes('phone: displayPhone'));
});

test('CASE 24 Supabase member detail falls back to Firestore users profile for demographics', () => {
  assert.ok(workerSource.includes("firestoreGetDataOrNull(env, 'users', firebaseUid).catch(() => null)"));
  assert.ok(workerSource.includes("birth_date: member?.birth_date || getAdminProfileBirthDate(profile) || null"));
  assert.ok(workerSource.includes("phone: member?.phone || getAdminProfilePhone(profile) || null"));
});

test('CASE 25 member login event does not create an empty Firestore users profile', () => {
  assert.ok(workerSource.includes('const hasRequiredProfileInput = Boolean(name &&'));
  assert.ok(workerSource.includes("eventType !== 'member_joined' && eventType !== 'profile_updated') return null"));
});


test('CASE 26 Firestore rules allow all user profile fields written on signup', () => {
  const rulesSource = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  for (const key of ['uid', 'userId', 'loginId', 'fullName', 'realName', 'email', 'phoneNumber', 'phone', 'dateOfBirth', 'birthDate', 'joinedAt', 'crmJoinedAt', 'createdAt', 'updatedAt']) {
    assert.ok(rulesSource.includes("\"" + key + "\""), key + " missing from allowedUserProfileKeys");
  }
});
