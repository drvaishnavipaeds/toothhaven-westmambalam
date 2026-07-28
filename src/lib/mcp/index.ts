import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyAppointments from "./tools/list-my-appointments";
import listMyPrescriptions from "./tools/list-my-prescriptions";
import listMyInvoices from "./tools/list-my-invoices";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tooth-haven-mcp",
  title: "Tooth Haven Dental Care",
  version: "0.1.0",
  instructions:
    "Tools for Tooth Haven Multispeciality Dental Care patients. Once signed in, you can look up your patient profile, upcoming and past appointments, prescriptions, and invoices.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyAppointments, listMyPrescriptions, listMyInvoices],
});
