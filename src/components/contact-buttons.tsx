import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// تحويل الرقم المصري إلى صيغة واتساب الدولية (20)
function waNumber(phone: string): string {
  let p = phone.replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "20" + p.slice(1);
  else if (!p.startsWith("20")) p = "20" + p;
  return p;
}

export function CallButton({ phone, size = "icon" }: { phone: string; size?: "icon" | "default" }) {
  return (
    <Button asChild variant="outline" size={size} aria-label="اتصال">
      <a href={`tel:${phone}`}>
        <Phone className="text-primary" />
        {size === "default" && <span>اتصال</span>}
      </a>
    </Button>
  );
}

export function WhatsAppButton({ phone, size = "icon" }: { phone: string; size?: "icon" | "default" }) {
  return (
    <Button asChild variant="outline" size={size} aria-label="واتساب">
      <a href={`https://wa.me/${waNumber(phone)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="text-success" />
        {size === "default" && <span>واتساب</span>}
      </a>
    </Button>
  );
}
