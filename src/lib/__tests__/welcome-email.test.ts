import { describe, it, expect } from "vitest";
import {
  isTerminalWelcomeResult,
  markWelcomeAttempted,
  shouldAttemptWelcome,
  welcomeStorageKey,
} from "../welcomeEmail";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    size: () => map.size,
  };
}

describe("welcomeEmail guard", () => {
  it("tenta na primeira vez e não tenta depois de marcado", () => {
    const s = memoryStorage();
    expect(shouldAttemptWelcome("u1", s)).toBe(true);
    markWelcomeAttempted("u1", s);
    expect(shouldAttemptWelcome("u1", s)).toBe(false);
  });

  it("é por usuário — outro login não herda a marca", () => {
    const s = memoryStorage();
    markWelcomeAttempted("u1", s);
    expect(shouldAttemptWelcome("u2", s)).toBe(true);
    expect(welcomeStorageKey("u2")).not.toBe(welcomeStorageKey("u1"));
  });

  it("sem usuário não tenta", () => {
    expect(shouldAttemptWelcome(undefined, memoryStorage())).toBe(false);
    expect(shouldAttemptWelcome(null, null)).toBe(false);
  });

  it("sem storage tenta (servidor continua idempotente)", () => {
    expect(shouldAttemptWelcome("u1", null)).toBe(true);
  });

  it("respostas definitivas encerram novas tentativas", () => {
    for (const r of ["sent", "already_sent", "not_a_new_signup", "recipient_suppressed"]) {
      expect(isTerminalWelcomeResult(r, false)).toBe(true);
    }
  });

  it("falha ou estado transitório permite retry", () => {
    expect(isTerminalWelcomeResult("sent", true)).toBe(false);
    expect(isTerminalWelcomeResult("in_progress", false)).toBe(false);
    expect(isTerminalWelcomeResult(undefined, false)).toBe(false);
  });
});
