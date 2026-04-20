# Session Summary - 2026-04-19

## Request

Đọc lại context FE plan, check repo BE liên quan, đối chiếu payload manual quiz FE với schema BE, tìm nguyên nhân `400 Bad Request`, rồi chỉnh FE ở các điểm mapping/logging cần thiết.

## Scope

- Feature: Manual quiz create/edit flow
- Trong phạm vi: FE manual wizard payload, import question flow, question type mapping, console logging, đối chiếu BE validator
- Ngoài phạm vi: sửa logic BE, thay đổi contract endpoint, mobile

## Findings

- FE manual wizard đang gửi payload gần đúng schema BE nhưng còn khác ở vài điểm:
  - chưa gửi `passScore`
  - có gửi thêm `sectionType: "ROOT"`
  - có gửi thêm `question.orderIndex`
  - `difficulty` từng câu đang lấy theo `overallDifficulty`
- `quizIntent` manual dùng `REVIEW`, hợp lệ với BE.
- `difficulty` hiện fallback `MEDIUM`, đúng với yêu cầu tạm thời.
- Lỗi:

```json
{
  "statusCode": 400,
  "message": "sections[0].questions[1].answers: MULTIPLE_CHOICE cần đúng 1 đáp án đúng"
}
```

- Chuỗi lỗi này thực tế đi ra từ nhánh `SINGLE_CHOICE` trong `ManualQuizValidator`, không phải từ nhánh `MULTIPLE_CHOICE`.
- `QuizAttemptService` của BE lại xử lý `MULTIPLE_CHOICE` như loại nhiều đáp án đúng, nên BE đang có mâu thuẫn nội bộ giữa validator và runtime behavior.
- FE có rủi ro giữ lại `questionTypeId` cũ từ draft/import. Khi UI đang là "nhiều đáp án" nhưng `questionTypeId` cũ vẫn trỏ sang type khác, payload nhìn đúng trên UI nhưng BE sẽ validate sai type.

## Payload Observed

Payload FE đã log trên browser cho case lỗi:

```json
{
  "workspaceId": "20",
  "title": "quiz create test",
  "description": "",
  "timerMode": false,
  "duration": null,
  "quizIntent": "REVIEW",
  "overallDifficulty": "MEDIUM",
  "sections": [
    {
      "content": "Root",
      "orderIndex": 1,
      "sectionType": "ROOT",
      "questions": [
        {
          "questionTypeId": 1,
          "content": "123 là số đơn vị hàng mấy? ",
          "difficulty": "MEDIUM",
          "duration": 84,
          "score": 1,
          "answers": [
            { "content": "trăm ", "isCorrect": true },
            { "content": "chục", "isCorrect": false }
          ]
        },
        {
          "questionTypeId": 2,
          "content": "đâu là số chia hết cho 5",
          "difficulty": "MEDIUM",
          "duration": 84,
          "score": 1,
          "answers": [
            { "content": "5", "isCorrect": true },
            { "content": "10", "isCorrect": true },
            { "content": "3", "isCorrect": false },
            { "content": "6", "isCorrect": false }
          ]
        }
      ]
    }
  ]
}
```

Case này fail vì câu số 2 được backend hiểu là loại chỉ cho phép đúng 1 đáp án đúng.

## Files Changed

- `src/api/QuizAPI.js`
  - thêm `getQuestionById(questionId)` để import question giữ được `questionTypeId` gốc từ BE
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/ImportQuestionsPanel.jsx`
  - lấy question detail khi import
  - lưu `questionTypeId` gốc vào object FE
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/QuestionCard.jsx`
  - khi user đổi loại câu hỏi, clear `questionTypeId` cũ để tránh stale ID
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/Step1Config.jsx`
  - bỏ option `PRACTICE`, chỉ giữ các quiz intent khớp BE
- `src/Pages/Users/Individual/Workspace/Components/ManualQuizWizard/index.jsx`
  - load question types từ API thay vì dựa vào hardcoded ID
  - log payload submit ra console
  - log error response ra console
  - thêm guard bỏ qua `questionTypeId` stale nếu không khớp với `questionType` hiện tại trong UI

## Key Decisions

- Không hardcode `questionTypeId` trong manual wizard nếu đã có danh sách type từ API.
- Khi question đến từ import hoặc draft, chỉ reuse `questionTypeId` nếu nó khớp với loại câu hỏi hiện tại trên UI.
- Thêm logging ở FE để đối chiếu trực tiếp payload và error body khi debug `400`.
- Chưa sửa BE trong session này; mới chỉ ra chính xác file và logic validator đang mâu thuẫn.

## Verification

- Đã chạy: `npm run build`
- Kết quả: build pass
- FE hiện log các dòng sau khi submit:
  - `[ManualQuizWizard] createManualQuizBulk payload`
  - `[ManualQuizWizard] createManualQuizBulk payload JSON`
  - `[ManualQuizWizard] createManualQuizBulk error`
  - `[ManualQuizWizard] createManualQuizBulk error response`

## Risks Or Follow-ups

- Nếu localStorage còn draft cũ, vẫn nên test lại sau khi mở lại wizard hoặc xóa draft để chắc chắn không còn stale state.
- BE vẫn còn rủi ro thật ở validator:
  - `ManualQuizValidator` đang lệch logic/message giữa `SINGLE_CHOICE` và `MULTIPLE_CHOICE`
  - `QuizAttemptService` lại xử lý `MULTIPLE_CHOICE` theo semantics nhiều đáp án đúng
- Nếu sau fix FE mà request vẫn fail, bước tiếp theo nên là backend xác nhận mapping thật của `questionTypeId = 2` trong DB và sửa `ManualQuizValidator`.
