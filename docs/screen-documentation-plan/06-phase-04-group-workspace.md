# Phase 4 - Group Workspace

## Muc tieu phase

Doc group workspace theo 3 truc:

- role: leader vs member
- section: `?section=...`
- sub-view: create/detail/edit ben trong studio va challenge

## Thu tu doc code

1. `src/lib/routePaths.js`
2. `src/Pages/Users/Group/GroupWorkspacePage.jsx`
3. `src/Pages/Users/Group/Components/GroupSidebar.jsx`
4. `src/Pages/Users/Group/Components/StudioPanel.jsx`
5. `src/Pages/Users/Group/Components/ChatPanel.jsx`
6. Nhom profile/documents:
   - `GroupWorkspaceProfileConfigDialog.jsx`
   - `GroupDocumentsTab.jsx`
   - `SourceDetailView.jsx`
   - `UploadSourceDialog.jsx`
7. Nhom members:
   - `GroupMembersTab.jsx`
   - `InviteMemberDialog.jsx`
   - `GroupMemberStatsTab.jsx`
8. Nhom dashboard/settings/wallet:
   - `GroupDashboardTab.jsx`
   - `GroupWalletTab.jsx`
   - `GroupSettingsTab.jsx`
9. Nhom studio:
   - `QuizListView.jsx`
   - `CreateQuizForm.jsx`
   - `QuizDetailView.jsx`
   - `EditQuizForm.jsx`
   - `FlashcardListView.jsx`
   - `CreateFlashcardForm.jsx`
   - `MockTestListView.jsx`
   - `CreateGroupMockTestForm.jsx`
   - `MockTestDetailView.jsx`
   - `EditMockTestForm.jsx`
   - `RoadmapCanvasView*.jsx`
10. Nhom challenge/ranking:
    - `ChallengeTab.jsx`
    - `CreateChallengeWizard.jsx`
    - `ChallengeDetailView.jsx`
    - `GroupRankingTab.jsx`
11. API wrappers:
    - `GroupAPI.js`
    - `WorkspaceAPI.js`
    - `MaterialAPI.js`
    - `QuizAPI.js`
    - `RoadmapAPI.js`
    - `ChallengeAPI.js`
    - `FeedbackAPI.js` neu co lien ket tu ticket/chat

## Screen can chup va mo ta

### A. Shell, profile gate, dashboard

#### GRP-01 Group Dashboard

- Route: `?section=dashboard`
- Chup:
  - leader dashboard day du
  - compact analytics/cards
- Mo ta:
  - chi leader thay
  - CTA sang `memberStats`, `quiz`, hoac section khac

#### GRP-02 Personal Dashboard

- Route: `?section=personalDashboard`
- Chup:
  - member view
  - leader self-view neu route mo sang dashboard ca nhan
- Mo ta:
  - khac biet voi dashboard leader
  - learning snapshot / activity feed cho tung nguoi

#### GRP-27 Group Profile Setup Gate / Config Dialog

- Trigger:
  - group chua hoan thanh profile bat buoc
  - leader mo config lai
- Chup:
  - profile setup gate
  - config dialog
- Mo ta:
  - screen nao bi khoa neu profile chua xong
  - ai duoc phep cau hinh

### B. Documents va moderation

#### GRP-03 Group Documents Tab

- Route: `?section=documents`
- Chup:
  - approved sources
  - pending review queue
  - empty state
- Mo ta:
  - leader vs member action khac nhau
  - refresh, approve, reject, delete

#### GRP-04 Group Source Detail

- Trigger: mo 1 material
- Chup:
  - source detail da duyet
  - moderation detail
  - pending leader review
- Mo ta:
  - rule approve/reject
  - summary va metadata cua material

#### GRP-05 Upload Source Dialog

- Trigger: upload vao group
- Chup:
  - default upload
  - uploading
  - fail vi format / khong du credit / bi reject
- Mo ta:
  - accepted extension
  - pending-review flow

### C. Member management

#### GRP-06 Members Tab

- Route: `?section=members`
- Chup:
  - member table
  - pending invitation block
  - empty/loading state
- Mo ta:
  - grant/revoke upload
  - role update
  - remove member

#### GRP-07 Invite Member Dialog

- Trigger: tu members tab
- Chup:
  - default dialog
  - invited success
  - seat limit state neu co
- Mo ta:
  - input, validation, resend/cancel invitation

#### GRP-08 Member Stats Tab

- Route: `?section=memberStats`
- Chup:
  - selected learner state
  - no-data state
- Mo ta:
  - snapshot, quiz assignment insight, open quiz tab action

### D. Notifications, wallet, settings

#### GRP-09 Notifications / Activity Feed

- Route: `?section=notifications`
- Chup:
  - compact activity feed
  - empty state
- Mo ta:
  - su kien duoc tong hop tu dau

#### GRP-25 Group Wallet

- Route: `?section=wallet`
- Chup:
  - current balance
  - package/plan CTA
  - credit breakdown
- Mo ta:
  - wallet lien ket voi group workspace nao

#### GRP-26 Group Settings

- Route: `?section=settings`
- Chup:
  - metadata config
  - dangerous action block neu co
- Mo ta:
  - leader-only action
  - profile update entry

### E. Studio views

#### GRP-10 Roadmap Studio

- Route:
  - `?section=roadmap`
  - hoac deep-link `/group-workspaces/:id/roadmaps/...`
- Chup:
  - empty roadmap state
  - populated roadmap
  - generate phase progress
- Mo ta:
  - roadmap path params
  - relation giua roadmap, phase, knowledge, quiz

#### GRP-11 Quiz List

- Route: `?section=quiz`
- Chup:
  - populated list
  - empty state
  - member read-only state neu co
- Mo ta:
  - create/open quiz
  - refresh token hoac progress UI khi dang tao quiz

#### GRP-12 Create Quiz Form

- Trigger: create trong group studio
- Chup:
  - default create form
  - read-only blocked state
  - generating state
- Mo ta:
  - source selection
  - challenge draft mode neu co

#### GRP-13 Quiz Detail

- Trigger: open 1 quiz trong group
- Chup:
  - overview tab
  - review/ranking block neu co
  - leader/member permission khac nhau
- Mo ta:
  - chia se quiz cho group
  - inline discussion/review/ranking panel

#### GRP-14 Edit Quiz Form

- Trigger: edit quiz
- Chup:
  - populated form
  - challenge aligned mode neu co

#### GRP-15 / 16 / 17 Flashcard

- Tach 3 spec:
  - list
  - detail
  - create form
- Can chup:
  - populated va empty state
  - read-only state voi member

#### GRP-18 / 19 / 20 Mock Test

- Tach 3 spec:
  - list
  - create form
  - detail/edit
- Can chup:
  - plan gate khi khong co `hasAdvanceQuizConfig`
  - populated state

### F. Challenge va ranking

#### GRP-21 Challenge Hub

- Route: `?section=challenge`
- Chup:
  - list/tab tong quan
  - empty state
- Mo ta:
  - sub-tab trong challenge hub
  - create challenge entry

#### GRP-22 Create Challenge Wizard

- Trigger: create challenge trong challenge hub
- Chup:
  - wizard step 1
  - wizard step co chon quiz
  - validation/error
- Mo ta:
  - precondition can quiz hoac schedule

#### GRP-23 Challenge Detail

- Trigger: open 1 challenge
- Chup:
  - detail overview
  - bracket/leaderboard neu challenge co du lieu
  - CTA di sang quiz runtime neu co
- Mo ta:
  - participant, event, related quiz review flow

#### GRP-24 Ranking

- Route: `?section=ranking`
- Chup:
  - ranking populated
  - empty state
- Mo ta:
  - ranking tinh theo tieu chi nao

## Checklist verify sau phase nay

- Da tach ro screen theo `role + section + activeView`
- Da note ro screen nao la leader-only
- Da note ro screen nao member xem duoc nhung khong sua duoc
- Da note ro pending review, moderation, challenge va realtime la nhom logic dac biet

## Ghi chu quan trong

- `GroupWorkspacePage.jsx` co nhieu branch logic hon `WorkspacePage.jsx`, vi vua co role, vua co section, vua co deep-link roadmap.
- `QuizDetailView.jsx` trong group khong chi la detail; no con chua review va ranking panel, nen khong gom lai thanh mot mo ta qua ngan.
