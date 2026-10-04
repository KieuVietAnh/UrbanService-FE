import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const communityApi = read('../src/features/community/api/community-api.ts');
const communityFeedCard = read('../src/features/community/components/community-feed-card.tsx');
const communityMap = read('../src/features/community/components/community-map.native.tsx');
const communityDetail = read('../app/(resident)/community/[id].tsx');
const communityFeed = read('../app/(resident)/community/index.tsx');
const myIncidents = read('../app/(resident)/community/following.tsx');
const communitySupportCache = read('../src/features/community/utils/support-cache.ts');
const residentLayout = read('../app/(resident)/_layout.tsx');
const ticketDetail = read('../src/features/reporting/components/ticket-detail-screen.tsx');
const ticketReview = read('../src/features/reporting/components/ticket-review-screen.tsx');
const ticketsScreen = read('../src/features/reporting/components/tickets-screen.tsx');
const feedbackApi = read('../src/features/reporting/api/feedback-api.ts');
const messagingApi = read('../src/features/messaging/api/messaging-api.ts');
const feedbackChat = read('../src/features/messaging/components/feedback-chat-section.tsx');
const ticketMessagesRealtime = read('../src/features/messaging/realtime/use-ticket-messages-realtime.ts');
const legacyChatFab = read('../src/features/home/components/ChatFab.tsx');
const wizard = read('../src/features/reporting/components/create-feedback-wizard-screen.tsx');
const addressGeocoding = read('../src/features/reporting/services/address-geocoding.ts');
const areaBoundary = read('../src/features/reporting/services/area-boundary.ts');
const feedbackLocationMap = read('../src/features/reporting/components/feedback-location-picker.native.tsx');
const homeStyles = read('../src/features/home/homeStyles.ts');
const quickActions = read('../src/features/home/components/QuickActions.tsx');
const homeActions = read('../src/features/home/constants/homeActions.ts');
const inbox = read('../src/features/messaging/components/inbox-hub-screen.tsx');
const notifications = read('../src/features/notifications/components/notifications-screen.tsx');
const areaAlertsApi = read('../src/features/area-alerts/api/area-alerts-api.ts');
const aiConversation = read('../src/features/messaging/components/ai-conversation-screen.tsx');
const residentStatus = read('../src/features/resident-status.ts');
const swagger = read('../../../swagger.json');
const appConfig = read('../app.json');
const dynamicAppConfig = read('../app.config.js');
const rootLayout = read('../app/_layout.tsx');
const brandSplash = read('../src/screens/splash/SplashScreen.tsx');
const otpInput = read('../src/components/shared/otp-input.tsx');
const webCommunityApi = read('../../web/src/services/api/feedApi.js');

test('native and branded splash screens both use the bundled UrbanMind artwork', () => {
  assert.match(appConfig, /"expo-splash-screen"/);
  assert.match(appConfig, /"icon": "\.\/assets\/icon\.png"/);
  assert.match(appConfig, /"foregroundImage": "\.\/assets\/adaptive-icon\.png"/);
  assert.match(appConfig, /"image": "\.\/assets\/splash-logo\.jpg"/);
  assert.match(appConfig, /"android": \{[\s\S]*?"image": "\.\/assets\/icon\.png"[\s\S]*?"imageWidth": 160/);
  assert.match(dynamicAppConfig, /'expo-splash-screen'/);
  assert.match(dynamicAppConfig, /image: '\.\/assets\/splash-logo\.jpg'/);
  assert.match(dynamicAppConfig, /android: \{[\s\S]*?image: '\.\/assets\/icon\.png'[\s\S]*?imageWidth: 160/);
  assert.match(rootLayout, /BrandSplashScreen/);
  assert.match(rootLayout, /BRAND_SPLASH_DURATION_MS/);
  assert.match(brandSplash, /require\('\.\.\/\.\.\/\.\.\/assets\/splash-logo\.jpg'\)/);
});

test('community is Incident-centric while My Feedback remains Feedback-centric', () => {
  assert.match(communityApi, /\/api\/public\/incidents/);
  assert.match(webCommunityApi, /\/api\/public\/incidents/);
  assert.match(communityApi, /PageSize:\s*params\.pageSize \?\? 10/);
  assert.match(communityFeed, /pageSize:\s*20/);
  assert.match(communityFeed, /useInfiniteQuery/);
  assert.match(communityMap, /const PAGE_SIZE = 50/);
  assert.doesNotMatch(communityFeed, /sort:\s*'trending'/);
  assert.doesNotMatch(communityApi, /\/api\/user\/feedbacks\/feed/);
  assert.match(ticketDetail, /feedbackApi\.getById/);
  assert.match(ticketDetail, /ticket\.incidentId/);
});

test('resident can open the contracted list of followed or related incidents', () => {
  assert.match(swagger, /\/api\/user\/incidents\/me/);
  assert.match(communityApi, /getMyIncidents/);
  assert.match(communityApi, /axiosClient\.get\('\/api\/user\/incidents\/me'/);
  assert.match(myIncidents, /communityApi\.getMyIncidents/);
  assert.match(myIncidents, /Gồm các sự vụ bạn đang theo dõi hoặc có phản ánh liên quan/);
  assert.match(homeActions, /label:\s*'Sự vụ của tôi'/);
  assert.match(homeActions, /href:\s*'\/\(resident\)\/community\/following'/);
  assert.match(communityFeed, /\/\(resident\)\/community\/following/);
});

test('feedback detail keeps one private support entry point', () => {
  assert.match(ticketDetail, /Mở hỗ trợ/);
  assert.doesNotMatch(ticketDetail, /Trao đổi/);
  assert.doesNotMatch(ticketDetail, /showComments|BottomSheet|feedbackApi\.addComment/);
  assert.match(ticketDetail, /Xem tiến độ công khai và tham gia thảo luận cùng cộng đồng/);
});

test('resident resolution review follows the latest feedback detail contract', () => {
  assert.match(swagger, /"resolutionReview"/);
  assert.match(ticketDetail, /ticket\?\.resolutionReview/);
  assert.match(ticketDetail, /!resolutionReview/);
  assert.match(ticketDetail, /Đánh giá của bạn/);
  assert.match(ticketReview, /feedback\?\.resolutionReview/);
  assert.match(ticketReview, /disabled=\{alreadyReviewed\}/);
});

test('resident feedback history and support chat follow the live Web contracts', () => {
  assert.match(feedbackApi, /ticketApi\.getTicketPage/);
  assert.match(ticketsScreen, /feedbackApi\.listPage/);
  assert.match(ticketsScreen, /useInfiniteQuery/);
  assert.doesNotMatch(ticketsScreen, /feedbackApi\.listAll/);
  assert.match(messagingApi, /\/api\/feedbacks\/\$\{feedbackId\}\/messages/);
  assert.doesNotMatch(messagingApi, /\/api\/inbox\/conversations/);
  assert.match(ticketMessagesRealtime, /\/hubs\/ticket-messages/);
  assert.match(ticketMessagesRealtime, /TicketMessageReceived/);
  assert.match(ticketMessagesRealtime, /JoinTicket/);
  assert.match(ticketMessagesRealtime, /withAutomaticReconnect/);
  assert.match(feedbackChat, /setQueryData<ChatMessage\[]>/, 'Resident inserts realtime messages without waiting for the next REST poll');
  assert.match(feedbackChat, /if \(incoming\.isInternal\) return/, 'Resident must never render an internal Staff note');
  assert.match(legacyChatFab, /\/\(resident\)\/support\/select-feedback/);
});

test('community detail presents one four-step public journey instead of raw duplicate events', () => {
  assert.match(communityDetail, /const PUBLIC_JOURNEY_STEPS = \[/);
  assert.match(communityDetail, /label: 'Đã tiếp nhận',[\s\S]*?description: 'Sự vụ đã được ghi nhận'/);
  assert.match(communityDetail, /label: 'Đang xử lý',[\s\S]*?description: 'Đơn vị phụ trách thực hiện'/);
  assert.match(communityDetail, /label: 'Kiểm tra kết quả',[\s\S]*?description: 'Kết quả đang được rà soát'/);
  assert.match(communityDetail, /label: 'Hoàn tất',[\s\S]*?description: 'Sự vụ đã hoàn thành xử lý'/);
  assert.match(communityDetail, /PUBLIC_JOURNEY_STEPS\.map/);
  assert.doesNotMatch(communityDetail, /communityKeys\.timeline/);
  assert.doesNotMatch(communityDetail, /publicEventLabel/);
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
  assert.match(wizard, /getCameraPermissionsAsync/);
  assert.match(wizard, /requestCameraPermissionsAsync/);
  assert.match(wizard, /launchCameraAsync/);
  assert.match(wizard, /Chụp ảnh/);
  assert.match(wizard, /Thư viện/);
  assert.match(wizard, /handleAddAttachments/);
  assert.match(wizard, /Đã thêm \$\{added\} tệp từ thư viện/);
  assert.match(wizard, /Không thể mở thư viện ảnh/);
  assert.match(wizard, /Không thể mở camera/);
  assert.match(wizard, /Linking\.openSettings/);
  assert.doesNotMatch(wizard, /attachments\.length > 0 && attachments\.length < MAX_ATTACHMENT_COUNT/);
  assert.match(appConfig, /"expo-image-picker"[\s\S]*?"cameraPermission"[\s\S]*?"microphonePermission": false/);
  assert.match(dynamicAppConfig, /'expo-image-picker'[\s\S]*?cameraPermission:[\s\S]*?microphonePermission: false/);
});

test('feedback address input searches real Vietnamese geocoding services and focuses the map', () => {
  assert.match(addressGeocoding, /geocode\.arcgis\.com/);
  assert.match(addressGeocoding, /photon\.komoot\.io/);
  assert.match(addressGeocoding, /countryCode:\s*'VNM'/);
  assert.match(addressGeocoding, /LongLabel,ShortLabel,PlaceName,Place_addr/);
  assert.match(addressGeocoding, /searchExtent/);
  assert.match(addressGeocoding, /Mã bưu chính/);
  assert.match(addressGeocoding, /label:\s*string/);
  assert.match(addressGeocoding, /detail:\s*string/);
  assert.match(wizard, /searchVietnameseAddresses/);
  assert.match(wizard, /setTimeout\(async \(\) =>/);
  assert.match(wizard, /style=\{styles\.addressSearchBlock\}/);
  assert.match(wizard, /label="Tìm địa chỉ cụ thể"/);
  assert.match(wizard, /Dùng vị trí hiện tại/);
  assert.doesNotMatch(wizard, /label="Vĩ độ"/);
  assert.doesNotMatch(wizard, /label="Kinh độ"/);
  assert.match(wizard, /onAddressSelect\(suggestion\.displayName, suggestion\.latitude, suggestion\.longitude\)/);
  assert.match(wizard, /latitudeDelta:\s*0\.008/);
  assert.match(wizard, /boundaryPolygons=\{selectedAreaPolygons\}/);
  assert.match(wizard, /fitToCoordinates\(selectedAreaCoordinates/);
  assert.match(areaBoundary, /FeatureCollection/);
  assert.match(areaBoundary, /MultiPolygon/);
  assert.match(feedbackLocationMap, /<Polygon/);
  assert.match(feedbackLocationMap, /fillColor="rgba\(37, 99, 235, 0\.14\)"/);
  assert.match(wizard, /addressSuggestions\.slice\(0, 4\)/);
  assert.match(wizard, /\{suggestion\.label\}/);
  assert.match(wizard, /\{suggestion\.detail \|\| suggestion\.displayName\}/);
  assert.match(wizard, /Text as NativeText/);
  assert.match(wizard, /addressSuggestionItem:\s*\{\s*width:\s*'100%'/);
  assert.match(wizard, /addressSuggestionCopy:\s*\{\s*flexGrow:\s*1,\s*flexShrink:\s*1,\s*flexBasis:\s*0/);
  assert.doesNotMatch(wizard, /contentContainerStyle=\{styles\.addressSuggestionListContent\}/);
});

test('community support reacts immediately and reconciles with the API in background', () => {
  assert.match(communityFeedCard, /onMutate:\s*async/);
  assert.match(communityFeedCard, /supportMutation\.mutate\(!isSupported\)/);
  assert.doesNotMatch(communityFeedCard, /loading=\{supportMutation\.isPending\}/);
  assert.match(communityMap, /applyOptimisticCommunitySupport/);
  assert.doesNotMatch(communityMap, /Đang gửi\.\.\./);
  assert.match(communitySupportCache, /pages:\s*infiniteData\.pages\.map/);
  assert.match(communitySupportCache, /restoreCommunityCache/);
});

test('resident home keeps the chat FAB without covering content with an oversized control', () => {
  const floatingChat = read('../src/components/ui/FloatingChatMenu.tsx');
  assert.match(residentLayout, /<FloatingChatMenu/);
  assert.match(residentLayout, /insets\.bottom\s*\+\s*68/);
  assert.match(floatingChat, /width:\s*58/);
  assert.match(floatingChat, /height:\s*58/);
  assert.match(quickActions, /useWindowDimensions/);
  assert.match(quickActions, /const columnCount = isTablet \? QUICK_ACTIONS\.length : 3/);
  assert.match(quickActions, /quickActionsRow/);
  assert.match(homeStyles, /quickActionsRow:\s*\{/);
  assert.match(homeStyles, /actionItem:\s*\{[\s\S]*?flex:\s*1/);
  assert.doesNotMatch(homeStyles, /actionItemPhone:\s*\{\s*width:/);
  assert.doesNotMatch(homeStyles, /Dimensions\.get/);
  assert.doesNotMatch(homeStyles, /ACTION_WIDTH|ACTION_ROWS/);
});

test('cached inbox content stays visible during background refresh', () => {
  assert.match(inbox, /aiLoading\s*&&\s*aiData\s*===\s*undefined/);
  assert.match(inbox, /supportLoading\s*&&\s*supportThreads\s*===\s*undefined/);
  assert.match(inbox, /refreshing=\{aiRefetching\}/);
  assert.match(inbox, /refreshing=\{supportRefetching\s*&&\s*!isFetchingNextSupportPage\}/);
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

test('phone OTP follows the live backend and native Firebase contracts', () => {
  const authService = read('../src/features/auth/auth.service.ts');
  const firebasePhone = read('../src/features/auth/firebase-phone.service.ts');
  const verifyPhoneScreen = read('../app/(auth)/verify-phone.tsx');
  assert.match(swagger, /\/api\/auth\/phone-verification\/request-otp/);
  assert.match(swagger, /\/api\/auth\/phone-verification\/verify/);
  assert.match(authService, /authApi\.requestPhoneOtp/);
  assert.match(authService, /authApi\.verifyPhone/);
  assert.match(firebasePhone, /signInWithPhoneNumber/);
  assert.match(firebasePhone, /appVerificationDisabledForTesting\s*=\s*options\.isTestNumber\s*===\s*true/);
  assert.match(authService, /sendFirebasePhoneOtp\(approvedPhone, \{ isTestNumber: payload\.isTestNumber === true \}\)/);
  assert.match(firebasePhone, /getIdToken\(true\)/);
  assert.match(verifyPhoneScreen, /Xác thực số điện thoại/);
  assert.match(verifyPhoneScreen, /setStep\('otp'\);[\s\S]*?setAction\('send'\);[\s\S]*?await requestPhoneOtp/);
  assert.equal((otpInput.match(/style=\{styles\.nativeInput\}/g) || []).length, 1, 'OTP uses one native input so Android advances naturally');
  assert.match(otpInput, /onChangeText=\{\(text\) => onChange\(text\.replace\(\/\\D\/g, ''\)\.slice\(0, length\)\)\}/);
  assert.doesNotMatch(otpInput, /inputs\.current\[index \+ 1\]/);
  assert.match(dynamicAppConfig, /'@react-native-firebase\/app'/);
  assert.match(dynamicAppConfig, /'@react-native-firebase\/auth'/);
});
