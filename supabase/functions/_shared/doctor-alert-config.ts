export const DOCTOR_PHONE = "8925166149";
export const DOCTOR_ALERT_TEMPLATE = "th_doctor_appointment_review_v1";
export function appointmentReviewUrl(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid appointment reference");
  return `https://www.toothhaven.in/admin/dashboard?tab=appointments&appointment=${id}`;
}