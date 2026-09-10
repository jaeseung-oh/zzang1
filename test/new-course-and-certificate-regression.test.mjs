import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const certificateBodySource = read("lib/course/certificate-body.ts");
const catalogSource = read("lib/course/catalog.ts");
const productsSource = read("lib/course/application-products.ts");
const platformCoursesSource = read("lib/course/platform-courses.ts");
const documentsSource = read("lib/course/prevention-documents.ts");
const certificatePageSource = read("app/certificate/page.tsx");
const courseDetailSource = read("app/courses/[slug]/page.tsx");
const coursesPageSource = read("app/courses/page.tsx");
const workerSource = read("worker.js");

const exactBodies = [
  "위 사람은 본 기관에서 실시한 「음주운전 재범방지교육」 과정에 참여하여 음주운전의 위험성과 피해 영향에 대한 이해, 재범 위험요인의 점검 및 재범 예방을 위한 구체적인 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「숙취운전 재범방지교육」 과정에 참여하여 체내 알코올의 대사과정과 숙취 상태에서의 운전 위험성에 대한 이해, 잘못된 음주·운전 판단의 점검 및 재범 예방을 위한 구체적인 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「무면허운전 재범방지교육」 과정에 참여하여 무면허운전의 위험성과 법적·사회적 책임에 대한 이해, 위반행동의 위험요인 점검 및 재범 예방을 위한 구체적인 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「성범죄 재범방지교육」 과정에 참여하여 성범죄의 특성과 피해 영향에 대한 이해, 왜곡된 인식과 재범 위험요인의 점검 및 타인의 권리와 경계를 존중하는 구체적인 재범 예방 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「디지털성범죄 재범방지교육」 과정에 참여하여 디지털성범죄의 특성과 피해 영향에 대한 이해, 온라인 환경에서의 왜곡된 인식과 재범 위험요인의 점검 및 디지털 환경에서의 책임 있는 행동을 위한 구체적인 재범 예방 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「폭력범죄 재범방지교육」 과정에 참여하여 폭력행동의 위험성과 피해 영향에 대한 이해, 분노·충동 및 재범 위험요인의 점검과 비폭력적 문제해결을 위한 구체적인 행동조절 방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「마약중독 재범방지교육」 과정에 참여하여 마약류 사용의 신체적·심리적·사회적 위험성에 대한 이해, 재사용 및 재범 위험요인의 점검과 고위험 상황에 대처하기 위한 구체적인 재발·재범 예방 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「도박중독 재범방지교육」 과정에 참여하여 문제도박의 특성과 개인·가족·사회에 미치는 영향에 대한 이해, 도박행동을 지속시키는 인지·행동적 위험요인의 점검 및 재발과 재범 예방을 위한 구체적인 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「사기범죄 재범방지교육」 과정에 참여하여 사기범죄의 특성과 피해자에게 미치는 경제적·심리적 영향에 대한 이해, 범죄행동과 관련된 인지적·상황적 위험요인의 점검 및 재범 예방을 위한 구체적인 책임행동과 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「보이스피싱 재범방지교육」 과정에 참여하여 보이스피싱 범죄의 구조와 피해 영향에 대한 이해, 범죄 가담으로 이어질 수 있는 인지적·상황적 위험요인의 점검 및 유사한 범죄 제안과 고위험 상황에 대처하기 위한 구체적인 재범 예방 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「디지털범죄 재범방지교육」 과정에 참여하여 디지털 환경에서 발생하는 범죄의 특성과 피해 영향에 대한 이해, 온라인상 위법행동과 관련된 인지적·행동적 위험요인의 점검 및 책임 있는 디지털 행동을 위한 구체적인 재범 예방 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「악플·모욕·명예훼손 재범방지교육」 과정에 참여하여 온라인상 모욕·명예훼손 행위의 특성과 피해 영향에 대한 이해, 충동적 표현과 왜곡된 의사소통 방식의 위험요인 점검 및 타인의 권리를 존중하는 책임 있는 의사소통을 위한 구체적인 재범 예방 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
  "위 사람은 본 기관에서 실시한 「준법의식교육」 과정에 참여하여 법질서와 사회적 규범의 의미, 위법행동에 따른 개인적·사회적 책임에 대한 이해, 자신의 의사결정과 행동양식에 대한 점검 및 준법행동을 지속하기 위한 구체적인 실천방안 수립 등 소정의 교육과정을 이수하였기에 본 수료증을 발급합니다.",
];

test("basic completion certificate bodies keep the confirmed copy exactly", () => {
  for (const body of exactBodies) {
    assert.ok(certificateBodySource.includes(body), body);
  }
  assert.equal(certificateBodySource.includes("향정신성약물"), false);
  assert.ok(certificatePageSource.includes("getBasicCompletionCertificateBody(effectiveCourseId)"));
});

test("certificate body layout keeps Korean words intact for preview and PDF source DOM", () => {
  assert.ok(certificatePageSource.includes("word-break: keep-all !important"));
  assert.ok(certificatePageSource.includes("overflow-wrap: normal !important"));
  assert.ok(certificatePageSource.includes("line-break: strict !important"));
  assert.ok(certificatePageSource.includes("[word-break:keep-all]"));
  assert.ok(certificatePageSource.includes("[overflow-wrap:normal]"));
  assert.ok(certificatePageSource.includes("downloadPdfFromJpeg"));
});

test("new voice phishing and digital sexual crime courses are wired through catalog, UI products, documents, and worker payments", () => {
  const ids = [
    "voice-phishing-basic",
    "voice-phishing-advanced",
    "voice-phishing-advanced-counseling",
    "digital-sexual-crime-basic",
    "digital-sexual-crime-advanced",
    "digital-sexual-crime-advanced-counseling",
    "prostitution-basic",
    "prostitution-advanced",
    "prostitution-advanced-counseling",
  ];
  for (const id of ids) {
    if (id.endsWith("-advanced-counseling")) {
      assert.ok(productsSource.includes(id.replace("-advanced-counseling", "-advanced")), `application-products advanced source ${id}`);
      assert.ok(productsSource.includes("getNewPreventionProducts"), `application-products counseling builder ${id}`);
    } else {
      assert.ok(productsSource.includes(id), `application-products ${id}`);
    }
    assert.ok(workerSource.includes(id), `worker ${id}`);
  }
  assert.ok(productsSource.includes('getNewPreventionProducts("voice-phishing-basic", "voice-phishing-advanced")'));
  assert.ok(productsSource.includes('getNewPreventionProducts("digital-sexual-crime-basic", "digital-sexual-crime-advanced")'));
  assert.ok(productsSource.includes('getNewPreventionProducts("prostitution-basic", "prostitution-advanced")'));
  assert.ok(catalogSource.includes("40db2b4735841194439c22e90d9665be"));
  assert.ok(catalogSource.includes("fa6e84899afa4f5f1314b6c145c27feb"));
  assert.ok(catalogSource.includes("d01b607c43e0c6232706656082d044b8"));
  assert.ok(workerSource.includes("40db2b4735841194439c22e90d9665be"));
  assert.ok(workerSource.includes("fa6e84899afa4f5f1314b6c145c27feb"));
  assert.ok(workerSource.includes("d01b607c43e0c6232706656082d044b8"));
  assert.ok(platformCoursesSource.includes("voice-phishing-prevention"));
  assert.ok(platformCoursesSource.includes("digital-sexual-crime-prevention"));
  assert.ok(platformCoursesSource.includes("prostitution-prevention"));
  assert.ok(documentsSource.includes("voice-phishing-prevention-plan"));
  assert.ok(documentsSource.includes("digital-sexual-crime-prevention-plan"));
  assert.ok(documentsSource.includes("prostitution-prevention-plan"));
  assert.ok(certificatePageSource.indexOf('normalized.includes("digital-sexual-crime")') < certificatePageSource.indexOf('normalized.includes("digital-crime")'));
});

test("course detail comparison marks dedicated writing materials as included from basic", () => {
  assert.ok(courseDetailSource.includes('["음주운전 전용 작성자료", true, true, true]'));
  assert.ok(courseDetailSource.includes('[course.shortTitle + " 전용 작성자료", true, true, true]'));
});


test("courses page horizontal filters include new courses", () => {
  assert.ok(coursesPageSource.includes('["보이스피싱", "#voice-phishing-prevention"]'));
  assert.ok(coursesPageSource.includes('["디지털성범죄", "#digital-sexual-crime-prevention"]'));
  assert.ok(coursesPageSource.includes('["성매매", "#prostitution-prevention"]'));
});
