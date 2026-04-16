import { describe, expect, it } from "vitest";
import {
  GROUP_LEVEL_QUIZ_TITLE_MAX_LENGTH,
  resolveGroupQuizTitleMaxLength,
} from "@/Pages/Users/Group/utils/groupQuizTitleLimit";

describe("resolveGroupQuizTitleMaxLength", () => {
  it("returns 30 for group plans above level 0", () => {
    expect(
      resolveGroupQuizTitleMaxLength({
        plan: {
          planLevel: 1,
        },
      }),
    ).toBe(GROUP_LEVEL_QUIZ_TITLE_MAX_LENGTH);

    expect(
      resolveGroupQuizTitleMaxLength({
        plan: {
          planLevel: "2",
        },
      }),
    ).toBe(GROUP_LEVEL_QUIZ_TITLE_MAX_LENGTH);
  });

  it("does not apply a title cap for level 0 group plans", () => {
    expect(
      resolveGroupQuizTitleMaxLength({
        plan: {
          planLevel: 0,
        },
      }),
    ).toBeNull();

    expect(
      resolveGroupQuizTitleMaxLength({
        plan: {
          planLevel: "0",
        },
      }),
    ).toBeNull();
  });
});
