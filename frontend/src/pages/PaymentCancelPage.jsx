import { useNavigate } from "react-router-dom";
import { Car, XCircle, ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

const PaymentCancelPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4" data-testid="payment-cancel-page">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>

          <div className="py-8">
            <div className="bg-amber-500/20 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <XCircle className="h-12 w-12 text-amber-500" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">Paiement annulé</h2>
            <p className="text-gray-400 mb-6">
              Votre paiement a été annulé. Aucun montant n'a été débité.
            </p>
            <div className="space-y-3">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => navigate("/")} data-testid="retry-payment-btn">
                <CreditCard className="h-5 w-5 mr-2" /> Réessayer le paiement
              </Button>
            </div>
          </div>

          <Button variant="ghost" className="mt-6 text-gray-400 hover:text-white" onClick={() => navigate("/")} data-testid="back-home-btn">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour à l'accueil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancelPage;
