# Frontend ↔ Swagger Contract Audit Report

## Scope
This report audits the frontend API usage across the web app and shared API modules against the current Swagger contract in [swagger.json](swagger.json). No code changes were made.

## Severity Summary
- Critical: 5
- High: 6
- Medium: 4
- Low: 3

---

## Critical

### 1. Manager approval workflow is not contract-safe
- Endpoint / method
  - PUT /api/management/feedbacks/{feedbackId}/approve
  - PUT /api/management/feedbacks/{feedbackId}/need-rework
  - GET /api/management/feedbacks/{feedbackId}
- FE expectation
  - The approval UI sends a note and expects a successful 2xx response.
  - The detail screen expects nested resolution data and assignment/operator fields for the review UI.
- Swagger contract
  - Approve and need-rework endpoints exist, but the detail payload schema does not provide the richer resolution and assignment structure the UI reads.
  - The backend contract for the detail view is narrower than the UI’s assumptions.
- Request body / query params / headers
  - Approve uses a query parameter named note.
  - Need-rework sends a JSON string body with a content-type of application/json.
  - Headers are the standard bearer auth header injected by the shared client.
- Expected response fields
  - The UI expects a successful response to be usable without special handling, and the detail page expects fields such as resolution summary, action taken, result note, and operator name.
- Impact
  - This is a production blocker for the manager approval flow because the UI is wired to fields and actions that are not fully covered by the documented detail contract.

### 2. Management feedback list uses the wrong pagination contract
- Endpoint / method
  - GET /api/management/feedbacks
- FE expectation
  - The inbox page sends pageIndex and pageSize and reads response.items plus totalCount or total.
- Swagger contract
  - The endpoint expects PageNumber, PageSize, Status, CategoryId, and Search.
  - The response is a paged DTO with pageNumber, pageSize, totalItems, totalPages, hasPreviousPage, and hasNextPage.
- Request body / query params / headers
  - Query params from the UI are camelCase: pageIndex, pageSize, status, search.
  - Headers are the standard bearer auth header.
- Expected response fields
  - The UI expects items and a total counter, while Swagger provides a different paged structure.
- Impact
  - Pagination, page labels, and empty-state logic are likely incorrect when the backend returns the documented shape.

### 3. Feedback creation is sent with the wrong content type and body shape
- Endpoint / method
  - POST /api/user/feedbacks
- FE expectation
  - The shared ticket client sends a JSON object for normal submissions, including userId and reporterName.
- Swagger contract
  - The contract requires multipart/form-data with fields such as CategoryId, Title, Description, and LocationText.
- Request body / query params / headers
  - The FE sends a JSON body for non-file submissions and uses a generic application/json content type unless file attachments are detected.
  - The Swagger contract explicitly expects multipart/form-data and form fields.
- Expected response fields
  - The UI expects the returned detail object to be a full feedback detail payload.
- Impact
  - The create-ticket flow is a high-risk production blocker because it can fail at the API boundary or be rejected by the backend even when the UI validates locally.

### 4. Community feed query contract is not aligned with Swagger
- Endpoint / method
  - GET /api/user/feedbacks/feed
- FE expectation
  - The feed wrapper sends page and tab query parameters.
- Swagger contract
  - The documented contract expects PageNumber, PageSize, Status, CategoryId, and Search.
- Request body / query params / headers
  - The FE uses page and tab, which are not part of the Swagger contract.
  - Headers are standard bearer auth headers.
- Expected response fields
  - The UI normalizes several possible response shapes into items, pageNumber, pageSize, totalItems, and totalPages.
- Impact
  - The public/community feed can return incorrect results or be filtered incorrectly if the backend ignores the custom query names.

### 5. Management comment flows are using a path and payload that are not fully documented
- Endpoint / method
  - POST /api/management/feedbacks/{feedbackId}/comments
  - POST /api/user/feedbacks/{feedbackId}/comments
- FE expectation
  - The shared ticket client posts comments with userId, userName, userRole, and content for management-style flows.
- Swagger contract
  - The documented user-feedback comment endpoint accepts only content in the request body.
  - There is no documented management-role comment endpoint in the current Swagger.
- Request body / query params / headers
  - The FE sends extra properties beyond the documented schema.
  - Headers are standard bearer auth headers.
- Expected response fields
  - The UI expects a comment object with user and content details.
- Impact
  - Staff and manager comment actions are a production blocker because they use an undocumented path and a body shape that the Swagger schema rejects.

---

## High

### 6. Missing endpoint for merge/duplicate workflow
- Endpoint / method
  - POST /api/management/feedbacks/merge
- FE expectation
  - The shared ticket client calls a merge endpoint when duplicate tickets are detected.
- Swagger contract
  - No merge endpoint is documented for the management feedback API.
- Request body / query params / headers
  - The FE sends masterId, duplicateIds, and staffUserId.
- Impact
  - Duplicate-detection and merge flows are currently unsupported by the documented contract.

### 7. Missing endpoint for completion documents used by the approval detail page
- Endpoint / method
  - GET /api/management/feedbacks/{feedbackId}/completion-documents
  - GET /api/management/feedbacks/{feedbackId}/documents
  - GET /api/management/feedbacks/{feedbackId}/provider-reports/documents
- FE expectation
  - The approval detail screen loads provider reports and completion documents to render evidence and supporting files.
- Swagger contract
  - Only provider reports are clearly documented; the completion-document paths used by the UI are not present in the current Swagger.
- Impact
  - The approval detail screen cannot reliably render all evidence attachments because the contract does not cover the document endpoints it depends on.

### 8. Role names used by the frontend do not match the Swagger role vocabulary
- Endpoint / method
  - All protected endpoints
- FE expectation
  - The UI and routing layer use internal role names such as system-staff, interaction-manager, administrator, service-user, and service-provider.
- Swagger contract
  - The documented role vocabulary is SYSTEMSTAFF, INTERACTIONMANAGER, SYSTEMADMIN, and SERVICEUSER.
- Request body / query params / headers
  - Role values are used indirectly through route guards and API path selection logic.
- Impact
  - Authorization behavior can break or become inconsistent when the front end and backend rely on different role representations.

### 9. SLA and category management routes are not aligned with Swagger
- Endpoint / method
  - GET /api/management/sla
  - PUT /api/management/sla-config
  - GET /api/management/categories
  - POST /api/management/categories
- FE expectation
  - The shared SLA module uses management-scoped paths for SLA and category management.
- Swagger contract
  - The Swagger contract documents /api/categories and /api/categories/{categoryId} instead of management-scoped category paths.
- Impact
  - SLA and category management pages can fail or fall back to mock data if the backend does not expose these management routes.

### 10. Chatbot endpoints are called by the frontend but are not documented in Swagger
- Endpoint / method
  - POST /api/chatbot/message
  - GET /api/chatbot/ticket-status/{ticketId}
  - GET /api/chatbot/urban-service-answer
- FE expectation
  - The web app uses chatbot helpers for support and status lookups.
- Swagger contract
  - No matching chatbot paths are present in the current Swagger document.
- Impact
  - The chatbot experience depends on endpoints that are outside the documented contract.

---

## Medium

### 11. User profile endpoints are used by the frontend but are not documented in Swagger
- Endpoint / method
  - GET /api/user/profile/{userId}
  - PUT /api/user/profile/{userId}
- FE expectation
  - The profile module reads and updates the current user profile data.
- Swagger contract
  - No profile endpoint is documented.
- Impact
  - Profile pages are incomplete until the backend contract exposes these routes.

### 12. Admin user list is consumed with a paged-response assumption that is only partially compatible with Swagger
- Endpoint / method
  - GET /api/admin/users
- FE expectation
  - The user-management flow expects a list-like response and reads items or array content when present.
- Swagger contract
  - The endpoint returns a paged result schema with a paged DTO wrapper.
- Request body / query params / headers
  - The FE passes pageSize and uses the standard bearer auth header.
- Impact
  - The UI may need extra normalization to render users correctly if the backend returns the paged wrapper.

### 13. Notification pagination is implemented in a way that assumes a normalized wrapper
- Endpoint / method
  - GET /api/notifications
  - PATCH /api/notifications/{notificationId}/read
  - PATCH /api/notifications/read-all
- FE expectation
  - The notification hook expects a normalized paged structure with items, pageNumber, pageSize, totalItems, and totalPages.
- Swagger contract
  - The documented contract uses the standard paged DTO shape for notifications.
- Impact
  - Notification list rendering is resilient but still depends on the FE normalization layer to bridge the response shape.

### 14. Attachment handling uses multipart semantics but the backend contract is only partially mirrored
- Endpoint / method
  - POST /api/user/feedbacks/{feedbackId}/attachments
- FE expectation
  - The attachment flow sends multipart/form-data with Files field.
- Swagger contract
  - The documented contract confirms multipart/form-data for attachments.
- Impact
  - This is mostly compatible, but it should be treated as a contract area to validate as the attachment payload evolves.

---

## Low

### 15. Auth logout is a client-only no-op rather than a documented API operation
- Endpoint / method
  - No backend endpoint is called.
- FE expectation
  - The logout flow expects the backend to end the session.
- Swagger contract
  - No logout route is documented.
- Impact
  - This is low severity because the current implementation resolves locally and does not break the UI flow.

### 16. Some modules use local mock fallbacks when API contracts fail
- Endpoint / method
  - Multiple endpoints across the shared API layer
- FE expectation
  - The UI can continue to render data even when the live API fails.
- Swagger contract
  - The contract does not define these fallback behaviors.
- Impact
  - These are resilience mechanisms rather than direct contract mismatches, but they mask backend contract issues from the user experience.

### 17. The shared API layer normalizes response fields to bridge UI and backend differences
- Endpoint / method
  - Multiple endpoints across tickets, management feedback, and analytics
- FE expectation
  - The UI wants a simplified response shape for statuses, attachments, and comments.
- Swagger contract
  - The backend schema may return slightly different field names or nesting.
- Impact
  - This is a maintainability concern rather than a direct blocker, but it increases the chance of future contract drift.
