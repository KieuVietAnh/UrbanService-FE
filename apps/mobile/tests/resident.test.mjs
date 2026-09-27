import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const communityApi = read('../src/features/community/api/community-api.ts');
const residentLayout = read('../app/(resident)/_layout.tsx');
const ticketDetail = read('../src/features/reporting/components/ticket-detail-screen.tsx');
const wizard = read('../src/features/reporting/components/create-feedback-wizard-screen.tsx');
const inbox = read('../src/features/messaging/components/inbox-hub-screen.tsx');
const notifications = read('../src/features/notifications/components/notifications-screen.tsx');
const areaAlertsApi = read('../src/features/area-alerts/api/area-alerts-api.ts');
const aiConversation = read('../src/features/messaging/components/ai-conversation-screen.tsx');
const residentStatus = read('../src/features/resident-status.ts');
const swagger = read('../../../swagger.json');

test('community is Incident-centric while My Feedback remains Feedback-centric', () => {
  assert.match(communityApi, /\/api\/public\/incidents/);
  assert.doesNotMatch(communityApi, /\/api\/user\/feedbacks\/feed/);
  assert.match(ticketDetail, /feedbackApi\.getById/);
  assert.match(ticketDetail, /ticket\.incidentId/);
});

test('resident detail actions cannot be covered by the Android tab or system navigation bars', () => {
  assert.match(residentLayout, /marginBottom:\s*tabBarHeight/);
  assert.match(residentLayout, /RESIDENT_TAB_BAR_HEIGHT\s*\+\s*insets\.bottom/);
  assert.match(ticketDetail, /insets\.bottom\s*\+\s*8/);
});

test('feedback evidence is optional and GPS metadata is honest and recoverable', () => {
  assert.doesNotMatch(wizard, /AI sẽ tự động phân loại/);
  assert.doesNotMatch(wizard, /if\s*\(attachments\.length\s*===\s*0\)/);
  assert.match(wizard, /getLastKnownPositionAsync/);
  assert.match(wizard, /GPS_TIMEOUT_MS/);
  assert.match(wizard, /locationAccuracyMeters/);
  assert.match(wizard, /setGeoSource\('GPS'\)/);
  assert.match(wizard, /setGeoSource\('MANUAL'\)/);
  assert.match(wizard, /geoSource,/);
});

test('cached inbox content stays visible during background refresh', () => {
  assert.match(inbox, /aiLoading\s*&&\s*aiData\s*===\s*undefined/);
  assert.match(inbox, /supportLoading\s*&&\s*supportThreads\s*===\s*undefined/);
  assert.match(inbox, /refreshing=\{aiRefetching\}/);
  assert.match(inbox, /refreshing=\{supportRefetching\}/);
});

test('notifications degrade to the correct list instead of leaving a dead View action', () => {
  assert.match(notifications, /community\/\$\{incidentId\}/);
  assert.match(notifications, /router\.push\('\/\(resident\)\/community'/);
  assert.match(notifications, /tickets\/\$\{targetId\}/);
  assert.match(notifications, /router\.push\('\/\(resident\)\/tickets'/);
});

test('Area Alerts and AI-assisted Feedback draft use real contracted paths', () => {
  assert.match(areaAlertsApi, /userAreaAlertApi\.getSubscriptions/);
  assert.match(areaAlertsApi, /userAreaAlertApi\.getAlerts/);
  assert.match(aiConversation, /createAiFeedbackDraft/);
  assert.match(aiConversation, /urbanmind:create-ticket-draft/);
  assert.match(aiConversation, /\/\(resident\)\/create-feedback/);
});

test('public status vocabulary does not expose internal rework or assignment mechanics', () => {
  assert.match(residentStatus, /Đã gửi/);
  assert.match(residentStatus, /Đã tiếp nhận/);
  assert.match(residentStatus, /Đang xử lý/);
  assert.match(residentStatus, /Đang kiểm tra kết quả/);
  assert.match(residentStatus, /Hoàn thành/);
  assert.doesNotMatch(residentStatus, /NeedRework|Provider|Phân công/);
});

test('phone OTP remains backend-blocked instead of being implemented with a fabricated route', () => {
  assert.doesNotMatch(swagger, /phone[^\n]{0,80}otp|otp[^\n]{0,80}phone|verify-phone|send-phone/i);
});
