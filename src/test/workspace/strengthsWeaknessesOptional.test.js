import { describe, expect, it } from "vitest";
import {
  shouldRunLiveConsistency,
  validateWorkspaceProfileStep,
} from "@/pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/workspaceProfileWizardUtils";

const t = (key) => key;

const baseValues = {
  workspacePurpose: "REVIEW",
  knowledgeInput: "Probability & Statistics",
  inferredDomain: "Mathematics",
  selectedDomainOptionId: "math",
  currentLevel: "Đã học xác suất cơ bản",
  learningGoal: "Ôn lại đề thi cuối kỳ",
  strongAreas: "",
  weakAreas: "",
};

function runStep2(overrides = {}) {
  return validateWorkspaceProfileStep({
    targetStep: 2,
    values: { ...baseValues, ...overrides },
    t,
    analysisStatus: "success",
    canCreateRoadmap: true,
  });
}

describe("validateWorkspaceProfileStep — strengths/weaknesses are optional", () => {
  it("does NOT mark strongAreas/weakAreas as required for REVIEW non-beginner", () => {
    const errors = runStep2();
    expect(errors.strongAreas).toBeUndefined();
    expect(errors.weakAreas).toBeUndefined();
  });

  it("does NOT mark strongAreas/weakAreas as required for STUDY_NEW", () => {
    const errors = runStep2({ workspacePurpose: "STUDY_NEW" });
    expect(errors.strongAreas).toBeUndefined();
    expect(errors.weakAreas).toBeUndefined();
  });

  it("does NOT mark them as required for absolute-beginner level", () => {
    const errors = runStep2({ currentLevel: "Mới bắt đầu hoàn toàn" });
    expect(errors.strongAreas).toBeUndefined();
    expect(errors.weakAreas).toBeUndefined();
  });

  it("still requires currentLevel and learningGoal", () => {
    const errors = runStep2({ currentLevel: "", learningGoal: "" });
    expect(errors.currentLevel).toBe("workspace.profileConfig.validation.currentLevelRequired");
    expect(errors.learningGoal).toBe("workspace.profileConfig.validation.learningGoalRequired");
  });

  it("still surfaces format errors when strongAreas/weakAreas ARE filled", () => {
    // A single character violates the live-validation min-length rule.
    const errors = runStep2({ strongAreas: "x", weakAreas: "y" });
    expect(errors.strongAreas).toBeTruthy();
    expect(errors.weakAreas).toBeTruthy();
  });

  it("returns no strongAreas/weakAreas errors when fields are blank in any mode", () => {
    const allEmpty = runStep2({ strongAreas: "   ", weakAreas: "" });
    expect(allEmpty.strongAreas).toBeUndefined();
    expect(allEmpty.weakAreas).toBeUndefined();
  });
});

describe("shouldRunLiveConsistency — AI overall review fires without strengths/weaknesses", () => {
  const readyValues = {
    workspacePurpose: "REVIEW",
    knowledgeInput: "Toán 1",
    selectedKnowledgeOption: "Toán 1",
    selectedKnowledgeOptionId: "math1",
    inferredDomain: "Mathematics",
    selectedDomainOptionId: "math",
    currentLevel: "Đã học giải tích cơ bản",
    learningGoal: "Ôn lại để thi cuối kỳ",
    strongAreas: "",
    weakAreas: "",
  };

  it("triggers AI when knowledge + domain + purpose + currentLevel + learningGoal are ready (REVIEW non-beginner)", () => {
    expect(shouldRunLiveConsistency(readyValues)).toBe(true);
  });

  it("triggers AI for STUDY_NEW too without strengths/weaknesses", () => {
    expect(shouldRunLiveConsistency({ ...readyValues, workspacePurpose: "STUDY_NEW" })).toBe(true);
  });

  it("triggers AI for absolute-beginner level too", () => {
    expect(
      shouldRunLiveConsistency({ ...readyValues, currentLevel: "Mới bắt đầu hoàn toàn" }),
    ).toBe(true);
  });

  it("does NOT trigger AI when currentLevel is empty", () => {
    expect(shouldRunLiveConsistency({ ...readyValues, currentLevel: "" })).toBe(false);
  });

  it("does NOT trigger AI when learningGoal is empty", () => {
    expect(shouldRunLiveConsistency({ ...readyValues, learningGoal: "" })).toBe(false);
  });

  it("does NOT trigger AI when knowledge is missing", () => {
    expect(
      shouldRunLiveConsistency({
        ...readyValues,
        knowledgeInput: "",
        selectedKnowledgeOption: "",
        selectedKnowledgeOptionId: "",
      }),
    ).toBe(false);
  });

  it("does NOT trigger AI when domain is missing", () => {
    expect(
      shouldRunLiveConsistency({ ...readyValues, inferredDomain: "", selectedDomainOptionId: "" }),
    ).toBe(false);
  });

  it("still triggers when strengths/weaknesses ARE filled (no regression)", () => {
    expect(
      shouldRunLiveConsistency({
        ...readyValues,
        strongAreas: "đại số tuyến tính",
        weakAreas: "tích phân từng phần",
      }),
    ).toBe(true);
  });
});
