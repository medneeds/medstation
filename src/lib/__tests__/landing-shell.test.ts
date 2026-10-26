// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearLandingShellEmail,
  consumeLandingShellAction,
  peekLandingShellEmail,
} from "@/lib/landingShell";

const w = window as unknown as { __msShell?: Record<string, unknown> };

afterEach(() => {
  delete w.__msShell;
});

describe("topo instantâneo da landing", () => {
  it("repete cada ação feita antes do app carregar uma única vez", () => {
    w.__msShell = { email: "", focused: false, submitted: true, subscribe: true, google: false };
    expect(consumeLandingShellAction("subscribe")).toBe(true);
    expect(consumeLandingShellAction("subscribe")).toBe(false);
    expect(consumeLandingShellAction("submitted")).toBe(true);
    expect(consumeLandingShellAction("google")).toBe(false);
  });

  it("sem topo instantâneo (outras páginas), nada é repetido", () => {
    expect(consumeLandingShellAction("subscribe")).toBe(false);
    expect(peekLandingShellEmail()).toEqual({ email: "", focused: false });
  });

  it("o e-mail digitado passa para o formulário e depois é limpo", () => {
    w.__msShell = { email: "dr@exemplo.com", focused: true, submitted: false, subscribe: false, google: false };
    expect(peekLandingShellEmail()).toEqual({ email: "dr@exemplo.com", focused: true });
    clearLandingShellEmail();
    expect(peekLandingShellEmail()).toEqual({ email: "", focused: false });
  });

  it("a cópia em index.html tem o mesmo título principal da landing", () => {
    const html = readFileSync(resolve(__dirname, "../../../index.html"), "utf8");
    const lp3 = readFileSync(resolve(__dirname, "../../pages/Lp3.tsx"), "utf8");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const shellTitle = doc.querySelector("#ms-shell h1")?.textContent?.replace(/\s+/g, " ").trim();
    expect(shellTitle).toBeTruthy();
    const lp3Title = lp3
      .match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
      .replace(/<[^>]+>|\{" "\}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    expect(shellTitle).toBe(lp3Title);
  });
});
