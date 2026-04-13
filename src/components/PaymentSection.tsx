import { useLanguage } from "@/contexts/LanguageContext";
import { Smartphone, QrCode } from "lucide-react";
import upiQrCode from "@/assets/upi-qr-code.jpg";

const PaymentSection = () => {
  const { t, lang } = useLanguage();

  return (
    <section id="payment" className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {lang === "ta" ? "கட்டணம் செலுத்துங்கள்" : "Make a Payment"}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {lang === "ta"
              ? "முன்பதிவு கட்டணம் அல்லது சிகிச்சை கட்டணத்தை UPI மூலம் செலுத்துங்கள்"
              : "Pay appointment fees or treatment charges easily via UPI"}
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-2xl shadow-card p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent flex items-center justify-center">
              <QrCode className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {lang === "ta" ? "UPI மூலம் கட்டணம் செலுத்துங்கள்" : "Pay via UPI"}
            </h3>
            <div className="mx-auto w-48 h-48 rounded-lg overflow-hidden border-2 border-border">
              <img
                src={upiQrCode}
                alt="Tooth Haven UPI QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {lang === "ta" ? "UPI ஐடி" : "UPI ID"}
              </p>
              <p className="font-mono font-semibold text-foreground text-sm bg-muted px-3 py-1.5 rounded-lg inline-block select-all">
                Q42218734@ybl
              </p>
            </div>
            <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
              <Smartphone className="w-4 h-4" />
              <span>
                {lang === "ta"
                  ? "எந்த UPI ஆப்ஸிலும் ஸ்கேன் செய்து பணம் செலுத்துங்கள்"
                  : "Scan & pay with any UPI app (PhonePe, GPay, Paytm)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaymentSection;
