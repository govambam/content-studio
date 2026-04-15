import { describe, it, expect } from "vitest";
import { isAlreadyMember } from "./workspaceMembers.js";

describe("isAlreadyMember", () => {
  it("returns false without throwing when a member has a null profile", () => {
    const members = [
      { id: "mem_1", role: "member", profile: null as any },
      { id: "mem_2", role: "member", profile: { email: "alice@example.com", name: "Alice" } },
    ];
    expect(() => isAlreadyMember("bob@example.com", members as any)).not.toThrow();
    expect(isAlreadyMember("bob@example.com", members as any)).toBe(false);
  });

  it("returns true when email matches a member with a valid profile", () => {
    const members = [
      { id: "mem_1", role: "member", profile: null as any },
      { id: "mem_2", role: "member", profile: { email: "alice@example.com", name: "Alice" } },
    ];
    expect(isAlreadyMember("alice@example.com", members as any)).toBe(true);
  });
});
