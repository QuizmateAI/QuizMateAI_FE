import { describe, expect, it } from "vitest";
import { buildAiValidationState } from "@/pages/Users/Individual/Workspace/Components/CreateQuizFormParts/createQuizForm.utils";

function t(key, options) {
  if (typeof options === "string") {
    return options;
  }

  if (options && typeof options.defaultValue === "string") {
    return options.defaultValue;
  }

  return key;
}

function buildBasePayload(overrides = {}) {
  return {
    aiDuration: 20,
    aiEasyDuration: 60,
    aiHardDuration: 180,
    aiMediumDuration: 120,
    aiName: "Demo quiz",
    aiPrompt: "Create a quiz focused on operating systems.",
    aiTimerMode: true,
    aiTotalQuestions: 10,
    bloomUnit: false,
    customDifficulty: {
      easy: 40,
      medium: 40,
      hard: 20,
    },
    difficultyDefs: [
      {
        id: 1,
        difficultyName: "MEDIUM",
        easyRatio: 40,
        mediumRatio: 40,
        hardRatio: 20,
      },
    ],
    hasAdvanceQuizConfig: false,
    minimumAiDurationMinutes: 5,
    questionTypeUnit: false,
    questionTypeDefinitions: [
      { questionTypeId: 1, questionType: "SINGLE_CHOICE" },
      { questionTypeId: 2, questionType: "TRUE_FALSE" },
      { questionTypeId: 5, questionType: "MATCHING" },
    ],
    questionUnit: false,
    quizTitleMaxLength: 120,
    selectedBloomSkills: [{ bloomId: 1, ratio: 100 }],
    selectedDifficultyId: 1,
    selectedMaterialIds: [10],
    selectedQTypes: [{ questionTypeId: 1, ratio: 100 }],
    structureItems: [],
    t,
    ...overrides,
  };
}

describe("buildAiValidationState plan gating", () => {
  it("rejects advanced question types when the current plan does not allow them", () => {
    const validationState = buildAiValidationState(
      buildBasePayload({
        selectedQTypes: [{ questionTypeId: 5, ratio: 100 }],
      }),
    );

    expect(validationState.isValid).toBe(false);
    expect(validationState.firstInvalidSection).toBe("questionTypes");
    expect(validationState.fieldErrors.selectedQTypes).toBe(
      "Advanced question types require a plan with advanced quiz configuration.",
    );
  });

  it("rejects advanced structure rows when the current plan does not allow them", () => {
    const validationState = buildAiValidationState(
      buildBasePayload({
        structureItems: [
          {
            difficulty: "MEDIUM",
            questionType: "MATCHING",
            bloomSkill: "REMEMBER",
            quantity: 10,
          },
        ],
      }),
    );

    expect(validationState.isValid).toBe(false);
    expect(validationState.fieldErrors.selectedQTypes).toBe(
      "Advanced question types require a plan with advanced quiz configuration.",
    );
  });

  it("allows advanced question types when the plan entitlement is available", () => {
    const validationState = buildAiValidationState(
      buildBasePayload({
        hasAdvanceQuizConfig: true,
        selectedQTypes: [{ questionTypeId: 5, ratio: 100 }],
        structureItems: [
          {
            difficulty: "MEDIUM",
            questionType: "MATCHING",
            bloomSkill: "REMEMBER",
            quantity: 10,
          },
        ],
      }),
    );

    expect(validationState.fieldErrors.selectedQTypes).toBeUndefined();
    expect(validationState.isValid).toBe(true);
  });

  it("uses the provided quiz title max length when a cap is configured", () => {
    const validationState = buildAiValidationState(
      buildBasePayload({
        aiName: "1234567890123456789012345678901",
        quizTitleMaxLength: 30,
      }),
    );

    expect(validationState.isValid).toBe(false);
    expect(validationState.fieldErrors.aiName).toBe(
      "Quiz title must be at most 30 characters.",
    );
  });

  it("skips the quiz title max length check when no cap is configured", () => {
    const validationState = buildAiValidationState(
      buildBasePayload({
        aiName: "1234567890123456789012345678901234567890",
        quizTitleMaxLength: null,
      }),
    );

    expect(validationState.fieldErrors.aiName).toBeUndefined();
    expect(validationState.isValid).toBe(true);
  });
});
