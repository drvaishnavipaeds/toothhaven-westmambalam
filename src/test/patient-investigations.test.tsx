import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InvestigationsViewer from "../components/portal/InvestigationsViewer";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ lang: "en" }) }));
afterEach(() => { cleanup(); invoke.mockReset(); });

describe("patient-scoped investigations", () => {
  it("requests shared records using only the verified portal token", async () => {
    invoke.mockResolvedValue({ data: { investigations: [] }, error: null });
    render(<InvestigationsViewer portalToken="verified-patient-session" />);
    await screen.findByText("No investigations shared yet");
    expect(invoke).toHaveBeenCalledWith("appointment-workflow", {
      body: { action: "portal_investigations", portalToken: "verified-patient-session" },
    });
  });
  it("shows access failures instead of an empty patient history", async () => {
    invoke.mockResolvedValue({ data: null, error: new Error("Expired session") });
    render(<InvestigationsViewer portalToken="expired-session" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load shared investigations");
  });
  it("discards an earlier patient's delayed response after a session change", async () => {
    let resolveOld: ((value: unknown) => void) | undefined;
    invoke.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    invoke.mockResolvedValueOnce({ data: { investigations: [] }, error: null });
    const { rerender } = render(<InvestigationsViewer portalToken="first-patient" />);
    rerender(<InvestigationsViewer portalToken="second-patient" />);
    await screen.findByText("No investigations shared yet");
    resolveOld?.({ data: { investigations: [{ id: "old", title: "Other patient image" }] }, error: null });
    await waitFor(() => expect(screen.queryByText("Other patient image")).not.toBeInTheDocument());
  });
});