# Phase 5 - Quiz Runtime

## Muc tieu phase

Document cac screen nguoi dung thuc su lam bai: practice, exam, result. Nhom nay phai chup ky vi lien quan den auto-save, timer va scoring.

## Thu tu doc code

1. `src/App.jsx`
2. `src/Pages/Users/Quiz/PracticeQuizPage.jsx`
3. `src/Pages/Users/Quiz/ExamQuizPage.jsx`
4. `src/Pages/Users/Quiz/QuizResultPage.jsx`
5. `src/Pages/Users/Quiz/hooks/useQuizProgress.js`
6. `src/Pages/Users/Quiz/hooks/useQuizAutoSave.js`
7. `src/Pages/Users/Quiz/components/QuestionCard.jsx`
8. `src/Pages/Users/Quiz/components/QuestionNavPanel.jsx`
9. `src/api/QuizAPI.js`

## Screen can chup va mo ta

### QZ-01 Practice Quiz Page

- Route: `/quizzes/practice/:quizId`
- Chup:
  - question dang lam
  - sau khi bam check va hien feedback
  - loading state khi vao bai
- Mo ta:
  - practice mode cho feedback ngay
  - question navigation
  - selected answer state

### QZ-02 Exam Quiz Page

- Route: `/quizzes/exams/:quizId`
- Chup:
  - default question view
  - timer + answered state tren nav panel
  - submit confirm dialog neu co
  - state restore sau refresh neu co the tai hien
- Mo ta:
  - khong hien dung/sai ngay
  - auto-save answer va timer continuation
  - dieu kien submit

### QZ-03 Quiz Result Page

- Route: `/quizzes/results/:attemptId`
- Chup:
  - success result co score
  - question review section neu co
  - state loi khi attempt khong ton tai neu co
- Mo ta:
  - tong diem, accuracy, time spent
  - cac CTA quay lai workspace/group hoac lam lai

## Checklist verify sau phase nay

- Da ghi ro khac biet practice vs exam
- Da ghi ro auto-save, timer, submit, result
- Da note route nao duoc mo tu workspace va route nao duoc mo tu challenge/group
