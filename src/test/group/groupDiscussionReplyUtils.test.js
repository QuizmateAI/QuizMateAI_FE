import { describe, expect, it } from "vitest";
import {
  buildDiscussionMessageMap,
  getDiscussionReplyDepth,
  matchesDiscussionRealtimeThread,
  removeDiscussionMessage,
  upsertDiscussionMessage,
} from "@/Pages/Users/Group/Components/groupDiscussionReplyUtils";

describe("getDiscussionReplyDepth", () => {
  it("keeps direct replies on the second visual tier", () => {
    const messageMap = buildDiscussionMessageMap([
      { id: 1, body: "root" },
      { id: 2, parentMessageId: 1, body: "reply" },
    ]);

    expect(getDiscussionReplyDepth(messageMap, { id: 1, body: "root" })).toBe(0);
    expect(getDiscussionReplyDepth(messageMap, { id: 2, parentMessageId: 1, body: "reply" })).toBe(1);
  });

  it("caps nested replies so the UI never renders a third visual tier", () => {
    const messageMap = buildDiscussionMessageMap([
      { id: 1, body: "root" },
      { id: 2, parentMessageId: 1, body: "reply level 1" },
      { id: 3, parentMessageId: 2, body: "reply level 2" },
      { id: 4, parentMessageId: 3, body: "reply level 3" },
    ]);

    expect(getDiscussionReplyDepth(messageMap, { id: 3, parentMessageId: 2, body: "reply level 2" })).toBe(1);
    expect(getDiscussionReplyDepth(messageMap, { id: 4, parentMessageId: 3, body: "reply level 3" })).toBe(1);
  });
});

describe("discussion realtime helpers", () => {
  it("upserts messages without duplicating websocket echoes", () => {
    const currentMessages = [
      { id: "1", messageId: 1, body: "first", createdAt: "2026-04-23T01:00:00" },
    ];

    const appendedMessages = upsertDiscussionMessage(currentMessages, {
      id: "2",
      messageId: 2,
      body: "second",
      createdAt: "2026-04-23T01:01:00",
    });
    expect(appendedMessages).toHaveLength(2);

    const dedupedMessages = upsertDiscussionMessage(appendedMessages, {
      id: "2",
      messageId: 2,
      body: "second (echo)",
      createdAt: "2026-04-23T01:01:00",
    });
    expect(dedupedMessages).toHaveLength(2);
    expect(dedupedMessages[1].body).toBe("second (echo)");
  });

  it("removes a deleted realtime message by id", () => {
    const nextMessages = removeDiscussionMessage([
      { id: "1", messageId: 1, body: "first" },
      { id: "2", messageId: 2, body: "second" },
    ], 2);

    expect(nextMessages).toEqual([
      { id: "1", messageId: 1, body: "first" },
    ]);
  });

  it("matches websocket events only for the active thread scope", () => {
    expect(matchesDiscussionRealtimeThread({
      type: "DISCUSSION_MESSAGE_CREATED",
      quizId: 55,
      questionId: null,
    }, 55, null)).toBe(true);

    expect(matchesDiscussionRealtimeThread({
      type: "DISCUSSION_MESSAGE_CREATED",
      quizId: 55,
      questionId: 99,
    }, 55, null)).toBe(false);

    expect(matchesDiscussionRealtimeThread({
      type: "DISCUSSION_MESSAGE_CREATED",
      quizId: 55,
      questionId: 99,
    }, 55, 99)).toBe(true);
  });
});
