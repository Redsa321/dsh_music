import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MusicApp } from "@/components/music-app";

describe("guest music space", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ demoAvailable: true, configured: { google: false, openai: false, database: false }, user: null, youtubeConnected: false }),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("lets a visitor enter the demo and explore their empty library without signing in", async () => {
    render(<MusicApp />);

    expect(screen.getByRole("heading", { name: "A soundtrack for your state of mind." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try the demo" }));

    expect(await screen.findByRole("heading", { name: "What does today sound like?" })).toBeInTheDocument();
    expect(screen.getAllByText("Demo mode").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Library" })[0]);

    expect(screen.getByRole("heading", { name: "Library" })).toBeInTheDocument();
    expect(screen.getByText("Your generated playlists will gather here.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "What does today sound like?" })).not.toBeInTheDocument();

    await waitFor(() => expect(window.localStorage.getItem("dsh-music:demo:v1")).not.toBeNull());
    const stored = JSON.parse(window.localStorage.getItem("dsh-music:demo:v1") || "{}");
    expect(stored.history).toEqual([]);
    expect(stored.moods).toEqual([]);
  });
});
