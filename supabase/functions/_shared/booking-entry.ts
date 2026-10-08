/** Chat requests never reserve a slot; verified patients choose live availability. */
export function patientBookingEntry() {
  return {
    ok: true,
    bookingCreated: false,
    bookingUrl: "https://www.toothhaven.in/patient-portal",
    message: "No appointment has been created or reserved. Sign in or register at https://www.toothhaven.in/patient-portal, then select an available date and time. The clinic will confirm your request.",
  };
}