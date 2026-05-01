import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Smartphone, QrCode, CreditCard, IndianRupee, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import upiQrCode from "@/assets/upi-qr-code.jpg";

const UPI_ID = "Q42218734@ybl";
const PAYEE_NAME = "Tooth Haven Dental";
const RAZORPAY_KEY = "rzp_test_SdQ7562mMWoVkM";

const PaymentSection = () => {
  const { lang } = useLanguage();
  const [amount, setAmount] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [purpose, setPurpose] = useState("appointment");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card">("upi");
  const [processing, setProcessing] = useState(false);

  const buildUpiParams = (amt: string) => {
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: PAYEE_NAME,
      am: amt,
      cu: "INR",
      tn: `Tooth Haven - ${purpose}`,
    });
    return params.toString();
  };

  const generateGenericUpiLink = (amt: string) => `upi://pay?${buildUpiParams(amt)}`;
  const generatePhonePeLink = (amt: string) => `phonepe://pay?${buildUpiParams(amt)}`;
  const generateGPayLink = (amt: string) => `tez://upi/pay?${buildUpiParams(amt)}`;
  const generatePaytmLink = (amt: string) => `paytmmp://pay?${buildUpiParams(amt)}`;

  const sendNotification = async (method: string, amt: string) => {
    try {
      await supabase.functions.invoke("payment-notification", {
        body: {
          patientName,
          patientPhone,
          amount: amt,
          purpose,
          paymentMethod: method,
        },
      });
    } catch (e) {
      console.error("Notification failed:", e);
    }
  };

  const handleUpiPay = () => {
    if (!amount || !patientName || !patientPhone) {
      toast.error(lang === "ta" ? "அனைத்து விவரங்களையும் நிரப்பவும்" : "Please fill all details");
      return;
    }
    const phonepeLink = generateUpiLink(amount);
    const genericLink = generateGenericUpiLink(amount);
    // Try PhonePe first, fallback to generic UPI
    const newWindow = window.open(phonepeLink, "_blank");
    setTimeout(() => {
      // If PhonePe didn't open, try generic UPI link
      if (!newWindow || newWindow.closed) {
        window.open(genericLink, "_blank");
      }
    }, 1500);
    sendNotification("UPI", amount);
    toast.success(lang === "ta" ? "PhonePe ஆப் திறக்கப்படுகிறது..." : "Opening PhonePe app...");
  };

  const handleRazorpayPay = () => {
    if (!amount || !patientName || !patientPhone) {
      toast.error(lang === "ta" ? "அனைத்து விவரங்களையும் நிரப்பவும்" : "Please fill all details");
      return;
    }

    if (typeof (window as any).Razorpay !== "function") {
      toast.error(
        lang === "ta"
          ? "Razorpay ஏற்றப்படவில்லை. பக்கத்தை புதுப்பிக்கவும்."
          : "Razorpay failed to load. Please refresh and try again."
      );
      console.error("Razorpay SDK not available on window");
      return;
    }

    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt < 1) {
      toast.error(lang === "ta" ? "சரியான தொகையை உள்ளிடவும்" : "Enter a valid amount");
      return;
    }

    setProcessing(true);

    const options = {
      key: RAZORPAY_KEY,
      amount: amt * 100,
      currency: "INR",
      name: "Tooth Haven Dental",
      description: `Payment for ${purpose}`,
      prefill: {
        name: patientName,
        contact: patientPhone,
      },
      theme: { color: "#2a9d8f" },
      handler: (response: any) => {
        toast.success(
          lang === "ta"
            ? `கட்டணம் வெற்றி! ID: ${response.razorpay_payment_id}`
            : `Payment successful! ID: ${response.razorpay_payment_id}`
        );
        sendNotification("Card/Netbanking", amount);
        setProcessing(false);
      },
      modal: {
        ondismiss: () => setProcessing(false),
      },
      method: {
        card: true,
        netbanking: true,
        wallet: false,
        upi: false,
        emi: false,
      },
    };

    try {
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        console.error("Razorpay payment failed:", response?.error);
        toast.error(
          lang === "ta"
            ? `கட்டணம் தோல்வி: ${response?.error?.description || ""}`
            : `Payment failed: ${response?.error?.description || "Please try again."}`
        );
        setProcessing(false);
      });
      rzp.open();
    } catch (e: any) {
      console.error("Razorpay open error:", e);
      toast.error(
        lang === "ta"
          ? "கட்டண சாளரம் திறக்க முடியவில்லை"
          : `Could not open payment window: ${e?.message || "Unknown error"}`
      );
      setProcessing(false);
    }
  };

  const presetAmounts = [500, 1000, 2000, 5000];

  return (
    <section id="payment" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {lang === "ta" ? "கட்டணம் செலுத்துங்கள்" : "Make a Payment"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {lang === "ta"
              ? "UPI, கார்டு அல்லது நெட்பேங்கிங் மூலம் பாதுகாப்பாக கட்டணம் செலுத்துங்கள்"
              : "Pay securely via UPI, Card or Netbanking"}
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="bg-card rounded-2xl shadow-card p-6 space-y-5">
            {/* Patient Details */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder={lang === "ta" ? "பெயர்" : "Your Name"}
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="tel"
                placeholder={lang === "ta" ? "தொலைபேசி எண்" : "Phone Number"}
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="appointment">{lang === "ta" ? "முன்பதிவு கட்டணம்" : "Appointment Fee"}</option>
                <option value="treatment">{lang === "ta" ? "சிகிச்சை கட்டணம்" : "Treatment Fee"}</option>
                <option value="followup">{lang === "ta" ? "தொடர் சிகிச்சை" : "Follow-up Visit"}</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                {lang === "ta" ? "தொகை (₹)" : "Amount (₹)"}
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {presetAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(String(amt))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      amount === String(amt)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-input hover:bg-accent"
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <input
                  type="number"
                  placeholder={lang === "ta" ? "தொகையை உள்ளிடவும்" : "Enter amount"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div>
              <div className="flex rounded-lg border border-input overflow-hidden">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    paymentMethod === "upi"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  UPI
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                    paymentMethod === "card"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {lang === "ta" ? "கார்டு / நெட்பேங்கிங்" : "Card / Netbanking"}
                </button>
              </div>
            </div>

            {/* UPI Section */}
            {paymentMethod === "upi" && (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-40 h-40 rounded-lg overflow-hidden border-2 border-border">
                  <img src={upiQrCode} alt="UPI QR Code" className="w-full h-full object-contain" />
                </div>
                <p className="font-mono text-sm bg-muted px-3 py-1.5 rounded-lg inline-block select-all">
                  {UPI_ID}
                </p>
                <button
                  type="button"
                  onClick={handleUpiPay}
                  disabled={!amount}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Smartphone className="w-5 h-5" />
                  {lang === "ta"
                    ? amount ? `₹${amount} PhonePe மூலம் செலுத்துங்கள்` : "தொகையை உள்ளிடவும்"
                    : amount ? `Pay ₹${amount} via PhonePe` : "Enter amount first"}
                </button>
                <p className="text-xs text-muted-foreground">
                  {lang === "ta"
                    ? "PhonePe ஆப் மூலம் நேரடியாக செலுத்தலாம். மற்ற UPI ஆப்களுக்கும் ஆதரவு உள்ளது"
                    : "Opens PhonePe directly. Also supports other UPI apps as fallback"}
                </p>
              </div>
            )}

            {/* Card / Netbanking Section */}
            {paymentMethod === "card" && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-accent flex items-center justify-center">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {lang === "ta"
                    ? "Razorpay மூலம் பாதுகாப்பான கட்டணம்"
                    : "Secure payment powered by Razorpay"}
                </p>
                <button
                  type="button"
                  onClick={handleRazorpayPay}
                  disabled={!amount || processing}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5" />
                  {processing
                    ? (lang === "ta" ? "செயலாக்கம்..." : "Processing...")
                    : amount
                      ? (lang === "ta" ? `₹${amount} கார்டு மூலம் செலுத்துங்கள்` : `Pay ₹${amount} via Card/Netbanking`)
                      : (lang === "ta" ? "தொகையை உள்ளிடவும்" : "Enter amount first")}
                </button>
              </div>
            )}

            {/* Security note */}
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground pt-2 border-t border-border">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>
                {lang === "ta"
                  ? "அனைத்து கட்டணங்களும் 100% பாதுகாப்பானவை"
                  : "All payments are 100% secure & encrypted"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentSection;
