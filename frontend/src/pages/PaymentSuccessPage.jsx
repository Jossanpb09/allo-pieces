import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Car, CheckCircle, Loader2, XCircle, ArrowLeft, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CONTACTS = {
  whatsappPro: "+33686721372",
  phone: "0232510433"
};

// Logo component
const Logo = () => (
  <div className="flex items-center gap-2">
    <div className="bg-red-600 rounded-md p-2">
      <Car className="h-6 w-6 text-white" />
    </div>
    <div className="font-heading font-bold text-xl uppercase tracking-tight">
      <span className="text-red-600">ALLO</span>
      <span className="text-white"> PIECES </span>
      <span className="text-red-600">76</span>
    </div>
  </div>
);

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading"); // loading, success, error
  const [paymentData, setPaymentData] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus("error");
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (pollCount >= maxAttempts) {
      setStatus("error");
      return;
    }

    try {
      const response = await axios.get(`${API}/payments/status/${sessionId}`);
      const data = response.data;

      if (data.payment_status === "paid") {
        setStatus("success");
        setPaymentData(data);
        return;
      } else if (data.status === "expired") {
        setStatus("error");
        return;
      }

      // Continue polling
      setPollCount((prev) => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    } catch (error) {
      console.error("Error checking payment status:", error);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4" data-testid="payment-success-page">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          {status === "loading" && (
            <div className="py-8" data-testid="payment-loading">
              <Loader2 className="h-16 w-16 text-red-500 mx-auto animate-spin mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Vérification du paiement...</h2>
              <p className="text-gray-400">Veuillez patienter quelques instants.</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-8" data-testid="payment-confirmed">
              <div className="bg-green-500/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Paiement réussi !</h2>
              <p className="text-gray-400 mb-6">Merci pour votre paiement. Nous vous contacterons rapidement.</p>
              
              {paymentData && (
                <div className="bg-zinc-800 rounded-lg p-4 mb-6 text-left">
                  <p className="text-gray-400 text-sm">Montant payé</p>
                  <p className="text-2xl font-bold text-green-500">
                    {(paymentData.amount_total / 100).toFixed(2)} {paymentData.currency?.toUpperCase()}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white">
                  <a href={`https://wa.me/${CONTACTS.whatsappPro}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-5 w-5 mr-2" /> Confirmer sur WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full border-gray-600 text-white hover:bg-white hover:text-gray-900">
                  <a href={`tel:${CONTACTS.phone}`}>
                    <Phone className="h-5 w-5 mr-2" /> Appeler pour confirmer
                  </a>
                </Button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="py-8" data-testid="payment-error">
              <div className="bg-red-500/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Erreur de paiement</h2>
              <p className="text-gray-400 mb-6">
                Le paiement n'a pas pu être vérifié. Contactez-nous si vous avez été débité.
              </p>
              <div className="space-y-3">
                <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <a href={`tel:${CONTACTS.phone}`}>
                    <Phone className="h-5 w-5 mr-2" /> Nous contacter
                  </a>
                </Button>
              </div>
            </div>
          )}

          <Button variant="ghost" className="mt-6 text-gray-400 hover:text-white" onClick={() => navigate("/")} data-testid="back-home-btn">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour à l'accueil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
