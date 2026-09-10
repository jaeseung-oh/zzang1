import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const certificateSource = fs.readFileSync(new URL('../app/certificate/page.tsx', import.meta.url), 'utf8');
const adminSource = fs.readFileSync(new URL('../app/admin/_components/admin-page.tsx', import.meta.url), 'utf8');
const workerSource = fs.readFileSync(new URL('../worker.js', import.meta.url), 'utf8');

test('certificate display separates first output completion date from current document footer date', () => {
  assert.ok(certificateSource.includes('const officialCompletionDate = getOfficialCompletionDate(certificate);'));
  assert.ok(certificateSource.includes('certificate.firstDocumentOutputAt'));
  assert.ok(certificateSource.includes('certificate.documentFirstOutputAt'));
  assert.ok(certificateSource.includes('const displayedCompletionDate = officialCompletionDate || lockedOutputDate;'));
  assert.ok(certificateSource.includes('const displayedIssueDate = getCurrentDocumentDisplayDate();'));
  assert.ok(certificateSource.includes('formatKoreanDate(isCompletionCertificate ? displayedCompletionDate : issuedAt)'));
  assert.ok(certificateSource.includes('{formatKoreanDate(displayedIssueDate)}'));
});

test('official completion date never falls back to the current browser date', () => {
  assert.ok(certificateSource.includes('if (!date) return "날짜 확인 필요";'));
  assert.equal(certificateSource.includes('const date = toDate(value) ?? new Date();'), false);
  assert.equal(certificateSource.includes('return issuedAt || null;'), false);
});

test('KST is used for certificate date formatting', () => {
  assert.ok(certificateSource.includes('timeZone: "Asia/Seoul"'));
  assert.ok(certificateSource.includes('new Intl.DateTimeFormat("ko-KR"'));
});

test('printing or PDF logging records first output date without overwriting completedAt', () => {
  assert.ok(workerSource.includes('firstDocumentOutputAt = certificate.firstDocumentOutputAt || certificate.documentFirstOutputAt || certificate.issuedAt || certificate.certificateIssuedAt || certificate.createdAt || nowIso'));
  assert.ok(workerSource.includes('firestorePatchIfUnchanged(env, certificatePath, certificatePatch, rawCertificate.updateTime)'));
  assert.ok(certificateSource.includes('setLockedOutputDate(firstOutputDate)'));
  assert.ok(certificateSource.includes('waitForLockedDateRender(lockedDate)'));
  assert.equal(workerSource.includes('certificatePatch.completedAt = firstDocumentOutputAt'), false);
  assert.equal(certificateSource.includes('completedAt: firstOutputDate'), false);
});

test('certificate issue does not create a current-date completion date on view', () => {
  assert.ok(workerSource.includes("const completedAt = documentType === 'attendance' ? issuedAt : null"));
  assert.equal(workerSource.includes('const completedAt = existing?.completedAt || enrollment.completedAt || issuedAt'), false);
  assert.equal(workerSource.includes("code: 'COMPLETION_DATE_MISSING'"), false);
});

test('admin displays reliable document issue state from loaded output logs', () => {
  assert.ok(adminSource.includes('function getOfficialCompletionDateForAdmin'));
  assert.ok(adminSource.includes('return getRecordDateCandidate(certificate, ["firstDocumentOutputAt", "documentFirstOutputAt", "issuedAt", "certificateIssuedAt", "createdAt"]);'));
  assert.ok(certificateSource.includes('certificate.issuedAt'));
  assert.ok(adminSource.includes('문서별 실제 발급상태'));
  assert.ok(adminSource.includes('실제 발급상태'));
  assert.ok(adminSource.includes('outputLastIssuedAt'));
  assert.equal(adminSource.includes('최근 조회/출력일자'), false);
});
