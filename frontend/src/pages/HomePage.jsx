import { useState, useEffect } from "react";
import axios from "axios";
import { Search, Phone, MessageCircle, ExternalLink, MapPin, Clock, Truck, Car, Lightbulb, Eye, Thermometer, Wrench, Settings, CreditCard, ShieldCheck, Menu, X, FileText, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Logo component - using provided text styling
const Logo = ({ className = "h-12" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
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

// Contact info
const CONTACTS = {
  whatsappPro: "+33686721372",
  phone: "0232510433",
  leboncoin: "https://www.leboncoin.fr/boutique/6876238/allo_pieces_76.htm"
};

const WHATSAPP_MESSAGE = encodeURIComponent(`Bonjour ALLO PIECES 76,
Je suis un professionnel.
Réf : __ | Véhicule : __ (plaque ou VIN).
Merci de confirmer le prix, la compatibilité et le délai.`);

const WHATSAPP_URL = `https://wa.me/${CONTACTS.whatsappPro}?text=${WHATSAPP_MESSAGE}`;

// Categories with icons
const CATEGORIES = [
  { id: "carrosserie", name: "Carrosserie", icon: Car, image: "https://images.unsplash.com/photo-1594500067672-3819eff9af4d?crop=entropy&cs=srgb&fm=jpg&q=85&w=400" },
  { id: "eclairage", name: "Éclairage", icon: Lightbulb, image: "https://images.unsplash.com/photo-1561338800-3aca39ac913e?crop=entropy&cs=srgb&fm=jpg&q=85&w=400" },
  { id: "retroviseur", name: "Rétroviseur", icon: Eye, image: "https://images.unsplash.com/photo-1656597631672-9a3bc4d3c72f?crop=entropy&cs=srgb&fm=jpg&q=85&w=400" },
  { id: "refroidissement", name: "Refroidissement", icon: Thermometer, image: "https://images.unsplash.com/photo-1644183230182-85bcf9b0ec5f?crop=entropy&cs=srgb&fm=jpg&q=85&w=400" },
  { id: "mecanique", name: "Mécanique", icon: Wrench, image: "https://images.unsplash.com/photo-1636761358756-ef34b4ef036a?crop=entropy&cs=srgb&fm=jpg&q=85&w=400" },
  { id: "accessoires", name: "Accessoires", icon: Settings, image: "https://images.unsplash.com/photo-1702146713882-2579afb0bfba?crop=entropy&cs=srgb&fm=jpg&q=85&w=400" }
];

// Stock badge component
const StockBadge = ({ stock }) => {
  const variants = {
    "En stock": "bg-green-500 text-white",
    "Sur commande (24-72h)": "bg-amber-500 text-white",
    "Rupture": "bg-red-500 text-white"
  };
  return <Badge className={`${variants[stock] || variants["En stock"]} text-xs font-medium`}>{stock}</Badge>;
};

// Product card component
const ProductCard = ({ product }) => {
  const productWhatsappMsg = encodeURIComponent(`Bonjour ALLO PIECES 76,
Je suis intéressé par :
Réf : ${product.reference}
Nom : ${product.name}
Véhicule : ${product.vehicle || "À préciser"}
Merci de confirmer le prix, la compatibilité et le délai.`);

  return (
    <Card className="product-card bg-white border border-gray-100 overflow-hidden" data-testid={`product-card-${product.id}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="font-heading font-bold text-sm text-gray-500 uppercase tracking-wide">{product.reference}</span>
          <StockBadge stock={product.stock} />
        </div>
        <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{product.name}</h3>
        {product.vehicle && <p className="text-sm text-gray-500 mb-3">{product.vehicle}</p>}
        <div className="flex items-center justify-between mt-3">
          <span className="text-2xl font-heading font-bold text-red-600">{product.price.toFixed(2)} €</span>
        </div>
        <div className="flex gap-2 mt-3">
          <Button asChild size="sm" className="flex-1 btn-whatsapp text-white" data-testid={`product-whatsapp-${product.id}`}>
            <a href={`https://wa.me/${CONTACTS.whatsappPro}?text=${productWhatsappMsg}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1 border-gray-300 text-gray-700" data-testid={`product-call-${product.id}`}>
            <a href={`tel:${CONTACTS.phone}`}>
              <Phone className="h-4 w-4 mr-1" /> Appeler
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Header component
const Header = ({ onPaymentClick, onQuoteClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/10" data-testid="main-header">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Logo />
          
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-3">
            <Button onClick={onQuoteClick} className="bg-amber-500 hover:bg-amber-600 text-black font-bold" data-testid="header-quote-btn">
              <FileText className="h-4 w-4 mr-2" /> Devis gratuit
            </Button>
            <Button asChild variant="ghost" className="text-white hover:bg-white/10" data-testid="header-whatsapp-btn">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-2 text-green-400" /> Professionnels
              </a>
            </Button>
            <Button asChild variant="ghost" className="text-white hover:bg-white/10" data-testid="header-phone-btn">
              <a href={`tel:${CONTACTS.phone}`}>
                <Phone className="h-4 w-4 mr-2 text-red-400" /> Particuliers
              </a>
            </Button>
            <Button asChild variant="ghost" className="text-white hover:bg-white/10" data-testid="header-leboncoin-btn">
              <a href={CONTACTS.leboncoin} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2 text-orange-400" /> Leboncoin
              </a>
            </Button>
            <Button onClick={onPaymentClick} className="bg-red-600 hover:bg-red-700 text-white" data-testid="header-payment-btn">
              <CreditCard className="h-4 w-4 mr-2" /> Payer en ligne
            </Button>
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden text-white p-2" onClick={() => setMenuOpen(!menuOpen)} data-testid="mobile-menu-toggle">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden pb-4 space-y-2">
            <Button onClick={() => { onQuoteClick(); setMenuOpen(false); }} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold">
              <FileText className="h-4 w-4 mr-2" /> Demander un devis gratuit
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-2 text-green-400" /> Professionnels (WhatsApp)
              </a>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
              <a href={`tel:${CONTACTS.phone}`}>
                <Phone className="h-4 w-4 mr-2 text-red-400" /> Particuliers (Appeler)
              </a>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start text-white hover:bg-white/10">
              <a href={CONTACTS.leboncoin} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2 text-orange-400" /> Boutique Leboncoin
              </a>
            </Button>
            <Button onClick={() => { onPaymentClick(); setMenuOpen(false); }} className="w-full bg-red-600 hover:bg-red-700 text-white">
              <CreditCard className="h-4 w-4 mr-2" /> Payer en ligne
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
};

// Mobile bottom bar
const MobileBottomBar = () => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 mobile-bottom-bar" data-testid="mobile-bottom-bar">
    <div className="flex">
      <a href={`tel:${CONTACTS.phone}`} className="flex-1 bg-red-600 text-white py-4 flex items-center justify-center gap-2 font-bold" data-testid="mobile-call-btn">
        <Phone className="h-5 w-5" /> APPELER
      </a>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-500 text-white py-4 flex items-center justify-center gap-2 font-bold" data-testid="mobile-whatsapp-btn">
        <MessageCircle className="h-5 w-5" /> WHATSAPP PRO
      </a>
    </div>
  </div>
);

// Payment modal
const PaymentModal = ({ open, onClose }) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/payments/checkout`, {
        amount: parseFloat(amount),
        description: description || `Paiement ${amount}€`,
        origin_url: window.location.origin
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erreur lors de la création du paiement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-md" data-testid="payment-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-green-600" />
            Paiement sécurisé
          </DialogTitle>
          <DialogDescription>
            Payez votre commande en toute sécurité via Stripe.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Montant (€)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ex: 89.90"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg"
              data-testid="payment-amount-input"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description (optionnel)</label>
            <Input
              placeholder="Ex: Pare-choc Clio 4"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="payment-description-input"
            />
          </div>
          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold"
            data-testid="payment-submit-btn"
          >
            {loading ? "Redirection..." : `Payer ${amount ? `${parseFloat(amount).toFixed(2)} €` : ""}`}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Paiement 100% sécurisé par Stripe. Vos données bancaires sont protégées.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Quote/Devis modal
const QuoteModal = ({ open, onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    plate_or_vin: "",
    part_description: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.plate_or_vin || !formData.part_description) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/quotes`, formData);
      setSuccess(true);
      toast.success("Demande de devis envoyée !");
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ name: "", email: "", phone: "", plate_or_vin: "", part_description: "" });
      }, 2000);
    } catch (error) {
      console.error("Quote error:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-lg" data-testid="quote-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-red-600" />
            Demande de devis gratuit
          </DialogTitle>
          <DialogDescription>
            Remplissez ce formulaire, nous vous répondrons rapidement avec un devis personnalisé.
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="py-8 text-center">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Demande envoyée !</h3>
            <p className="text-gray-500">Nous vous contacterons très rapidement.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Nom *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Votre nom"
                  required
                  data-testid="quote-name-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Téléphone *</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  required
                  data-testid="quote-phone-input"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="votre@email.com"
                required
                data-testid="quote-email-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Plaque d'immatriculation ou VIN *</label>
              <Input
                value={formData.plate_or_vin}
                onChange={(e) => setFormData({ ...formData, plate_or_vin: e.target.value })}
                placeholder="AB-123-CD ou numéro VIN"
                required
                data-testid="quote-plate-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Pièce recherchée *</label>
              <textarea
                value={formData.part_description}
                onChange={(e) => setFormData({ ...formData, part_description: e.target.value })}
                placeholder="Décrivez la pièce que vous recherchez (ex: pare-choc avant, phare gauche, rétroviseur droit...)"
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
                data-testid="quote-part-input"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-6 text-lg font-bold"
              data-testid="quote-submit-btn"
            >
              {loading ? "Envoi en cours..." : "Envoyer ma demande"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              📧 Réponse rapide par email à allopiece27@gmail.com
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Footer component
const Footer = () => (
  <footer className="bg-zinc-950 text-white py-12 border-t border-white/10" data-testid="footer">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Logo className="mb-4" />
          <p className="text-gray-400 text-sm">
            Pièces auto, carrosserie et mécanique. Livraison partout en France.
          </p>
        </div>
        <div>
          <h4 className="font-heading font-bold uppercase tracking-wide mb-4">Contact</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-400" />
              <span>Pro: +33 6 86 72 13 72</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-red-400" />
              <span>Part: 02 32 51 04 33</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" />
              <span>allopiece27@gmail.com</span>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-bold uppercase tracking-wide mb-4">Horaires</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Lun - Sam: 09h30 - 18h30</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Dimanche: Fermé</span>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-heading font-bold uppercase tracking-wide mb-4">Liens</h4>
          <ul className="space-y-2">
            <li>
              <a href={CONTACTS.leboncoin} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Boutique Leboncoin
              </a>
            </li>
            <li>
              <a href="/admin" className="text-gray-400 hover:text-white text-sm">Administration</a>
            </li>
            <li>
              <a href="/pro" className="text-gray-400 hover:text-white text-sm">Espace Pro</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-500 text-sm">
        © {new Date().getFullYear()} ALLO PIECES 76 - Tous droits réservés
      </div>
    </div>
  </footer>
);

// Main HomePage component
const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory) params.append("category", selectedCategory);
      
      const response = await axios.get(`${API}/products?${params.toString()}`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header onPaymentClick={() => setPaymentModalOpen(true)} onQuoteClick={() => setQuoteModalOpen(true)} />
      
      {/* Hero Section */}
      <section className="hero-bg pt-32 pb-20 px-4" data-testid="hero-section">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-red-600 rounded-xl p-4 animate-fade-in-up">
              <Car className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white uppercase tracking-tight mb-4 animate-fade-in-up animate-delay-100">
            Pièces Auto – Carrosserie & Mécanique
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-8 animate-fade-in-up animate-delay-200">
            Livraison partout en France 🇫🇷 | Paiement sécurisé
          </p>
          
          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-8 animate-fade-in-up animate-delay-300">
            <div className="search-input-wrapper relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
              <Input
                type="text"
                placeholder="Rechercher par référence, nom ou véhicule..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 text-lg bg-white text-gray-900 border-2 border-transparent focus:border-red-600 rounded-lg"
                data-testid="search-input"
              />
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-3 animate-fade-in-up animate-delay-300">
            <Button onClick={() => setQuoteModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-6" data-testid="hero-quote-btn">
              <FileText className="h-5 w-5 mr-2" /> Demander un devis
            </Button>
            <Button asChild className="btn-whatsapp text-white font-bold px-6" data-testid="hero-whatsapp-btn">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5 mr-2" /> WhatsApp Pro
              </a>
            </Button>
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white font-bold px-6" data-testid="hero-phone-btn">
              <a href={`tel:${CONTACTS.phone}`}>
                <Phone className="h-5 w-5 mr-2" /> Appeler
              </a>
            </Button>
            <Button asChild variant="outline" className="border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-white font-bold px-6" data-testid="hero-leboncoin-btn">
              <a href={CONTACTS.leboncoin} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5 mr-2" /> Leboncoin
              </a>
            </Button>
            <Button onClick={() => setPaymentModalOpen(true)} variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 font-bold px-6" data-testid="hero-payment-btn">
              <CreditCard className="h-5 w-5 mr-2" /> Payer en ligne
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-gray-100" data-testid="categories-section">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl font-bold text-gray-900 uppercase tracking-tight text-center mb-10">
            Nos Catégories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                  className={`relative overflow-hidden rounded-lg aspect-square group cursor-pointer transition-all ${isSelected ? 'ring-4 ring-red-600' : ''}`}
                  data-testid={`category-${cat.id}`}
                >
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 category-card-overlay flex flex-col items-center justify-end pb-4">
                    <Icon className="h-8 w-8 text-white mb-2" />
                    <span className="text-white font-heading font-bold uppercase text-sm">{cat.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedCategory && (
            <div className="text-center mt-4">
              <Button variant="ghost" onClick={() => setSelectedCategory(null)} className="text-gray-600" data-testid="clear-category-btn">
                Voir toutes les catégories
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16 bg-gray-100" data-testid="products-section">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl font-bold text-gray-900 uppercase tracking-tight text-center mb-10">
            {searchQuery ? `Résultats pour "${searchQuery}"` : selectedCategory ? `Catégorie: ${CATEGORIES.find(c => c.id === selectedCategory)?.name}` : "Nos Pièces"}
          </h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Chargement...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg" data-testid="no-results">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Pièce introuvable ?</h3>
              <p className="text-gray-500 mb-6">Envoyez la référence sur WhatsApp, nous vous répondons rapidement !</p>
              <Button asChild className="btn-whatsapp text-white">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5 mr-2" /> Contacter sur WhatsApp
                </a>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Delivery Section */}
      <section className="py-16 bg-zinc-900" data-testid="delivery-section">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl font-bold text-white uppercase tracking-tight text-center mb-10">
            <Truck className="inline h-8 w-8 mr-3 text-red-500" />
            Livraison France
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-zinc-800 rounded-lg p-6 text-center border border-zinc-700">
              <Truck className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-white mb-2">France métropolitaine</h3>
              <p className="text-gray-400 text-sm">Livraison partout en France</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-6 text-center border border-zinc-700">
              <Clock className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-white mb-2">Délais 24-72h</h3>
              <p className="text-gray-400 text-sm">Selon disponibilité du stock</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-6 text-center border border-zinc-700">
              <MapPin className="h-10 w-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-white mb-2">Retrait possible</h3>
              <p className="text-gray-400 text-sm">Sur rendez-vous</p>
            </div>
          </div>
          <p className="text-center text-gray-400 mt-8 text-sm">
            ⚠️ Vérification de compatibilité sur demande (plaque d'immatriculation ou numéro VIN)
          </p>
        </div>
      </section>

      {/* Quote CTA Section */}
      <section className="py-16 bg-amber-500" data-testid="quote-cta-section">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-black uppercase tracking-tight mb-4">
            Besoin d'un devis ?
          </h2>
          <p className="text-black/80 text-lg mb-8 max-w-2xl mx-auto">
            Envoyez-nous votre plaque d'immatriculation et la pièce recherchée. 
            Nous vous répondons rapidement avec un devis personnalisé !
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => setQuoteModalOpen(true)} size="lg" className="bg-black hover:bg-zinc-800 text-white font-bold px-8 py-6 text-lg" data-testid="cta-quote-btn">
              <FileText className="h-5 w-5 mr-2" /> Demander un devis gratuit
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-black text-black hover:bg-black hover:text-white font-bold px-8 py-6 text-lg">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5 mr-2" /> WhatsApp Pro
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-gray-100" data-testid="contact-section">
        <div className="container mx-auto px-4">
          <h2 className="font-heading text-3xl font-bold text-gray-900 uppercase tracking-tight text-center mb-10">
            Contact & Horaires
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-white">
              <CardContent className="p-6">
                <h3 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-red-600" /> Nous contacter
                </h3>
                <ul className="space-y-4">
                  <li>
                    <span className="text-sm text-gray-500 block mb-1">Professionnels (WhatsApp)</span>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-green-600 font-bold flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" /> +33 6 86 72 13 72
                    </a>
                  </li>
                  <li>
                    <span className="text-sm text-gray-500 block mb-1">Particuliers (Téléphone)</span>
                    <a href={`tel:${CONTACTS.phone}`} className="text-red-600 font-bold flex items-center gap-2">
                      <Phone className="h-5 w-5" /> 02 32 51 04 33
                    </a>
                  </li>
                  <li>
                    <span className="text-sm text-gray-500 block mb-1">Boutique en ligne</span>
                    <a href={CONTACTS.leboncoin} target="_blank" rel="noopener noreferrer" className="text-orange-600 font-bold flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" /> Leboncoin
                    </a>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-white">
              <CardContent className="p-6">
                <h3 className="font-heading font-bold text-xl mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-600" /> Horaires d'ouverture
                </h3>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">Lundi - Samedi</span>
                    <span className="font-bold text-gray-900">09h30 - 18h30</span>
                  </li>
                  <li className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Dimanche</span>
                    <span className="font-bold text-red-600">Fermé</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomBar />
      <PaymentModal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} />
      <QuoteModal open={quoteModalOpen} onClose={() => setQuoteModalOpen(false)} />
    </div>
  );
};

export default HomePage;
