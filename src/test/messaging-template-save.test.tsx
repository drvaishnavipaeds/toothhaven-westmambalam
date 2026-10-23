import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MessagingTemplates from "@/components/admin/MessagingTemplates";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const template = { id: "123456", name: "th_followup", language: "en", category: "UTILITY", status: "APPROVED", components: [{ type: "BODY", text: "Hello {{1}}, your appointment is scheduled with Tooth Haven. Please contact the clinic if you need assistance.", example: { body_text: [["Raman"]] } }] };
describe("Messaging template submission", () => {
  it("submits edits using the selected template ID and preserved variable samples", async () => {
    invoke.mockResolvedValue({ data: { templates: [template], canManage: true }, error: null });
    render(<MessagingTemplates onChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Message", { exact: true }), { target: { value: "Hello {{1}}, your appointment is confirmed with Tooth Haven. Please contact our team for any assistance." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit for Meta review" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("messaging-templates", { body: expect.objectContaining({ action: "edit", id: "123456", name: "th_followup", examples: ["Raman"] }) }));
  });
  it("submits a new template instead of changing an existing one", async () => {
    invoke.mockResolvedValue({ data: { templates: [], canManage: true }, error: null });
    render(<MessagingTemplates onChanged={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "New template" }));
    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "th_new_followup" } });
    fireEvent.change(screen.getByLabelText("Message", { exact: true }), { target: { value: "Please contact Tooth Haven to arrange your next dental follow-up appointment." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit for Meta review" }));
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("messaging-templates", { body: expect.objectContaining({ action: "create", name: "th_new_followup", examples: [] }) }));
    const saved = invoke.mock.calls.find(([, opts]) => opts.body.action === "create");
    expect(saved?.[1].body.id).toBeUndefined();
  });
});