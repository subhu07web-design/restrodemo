import React, { useState } from "react";
import { Sparkles, Tag, Copy, Check, ShieldCheck, Heart, Leaf, ChefHat } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OfferCode {
  code: string;
  discount: string;
  description: string;
  expiry: string;
  icon: string;
}

const ACTIVE_OFFERS: OfferCode[] = [
  {
    code: "EMPIRE20",
    discount: "20% OFF",
    description: "Get 20% off on all main courses and delicious desserts. Valid on your first order.",
    expiry: "Valid until Dec 2026",
    icon: "🔥"
  },
  {
    code: "WEEKEND30",
    discount: "30% OFF",
    description: "Get 30% off on family orders over ₹1000. Perfect for family weekend dinners.",
    expiry: "Every Sat-Sun active",
    icon: "🎉"
  },
  {
    code: "FREEBEV",
    discount: "FREE BEVERAGE",
    description: "Order any Signature Main and get a Fresh Mint Mojito completely free of charge.",
    expiry: "Limited period offer",
    icon: "🍹"
  }
];

export default function SpecialOffers() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div id="offers-story-section" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
      
      {/* SECTION 1: Active Promo Offers */}
      <div>
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3.5 py-1 text-xs font-semibold text-orange-600">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Special Diner Rewards</span>
          </span>
          <h2 className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
            Exclusive Culinary Offers
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
            Copy these premium coupons and paste them during checkout in your order cart to enjoy amazing discounts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ACTIVE_OFFERS.map((offer) => (
            <motion.div
              id={`offer-card-${offer.code}`}
              key={offer.code}
              whileHover={{ y: -4 }}
              className="relative overflow-hidden bg-white rounded-2xl border border-zinc-150 p-6 shadow-xs flex flex-col justify-between"
            >
              {/* Artistic side cutouts like a real ticket */}
              <div className="absolute top-1/2 -left-3 h-6 w-6 -translate-y-1/2 rounded-full bg-zinc-50 border-r border-zinc-150" />
              <div className="absolute top-1/2 -right-3 h-6 w-6 -translate-y-1/2 rounded-full bg-zinc-50 border-l border-zinc-150" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{offer.icon}</span>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-400">
                    {offer.expiry}
                  </span>
                </div>
                
                <h4 className="text-orange-500 font-sans text-xl font-black tracking-tight mb-1">
                  {offer.discount}
                </h4>
                <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                  {offer.description}
                </p>
              </div>

              {/* Promo code copy tab */}
              <div className="mt-4 border-t border-dashed border-zinc-150 pt-4 flex items-center justify-between bg-zinc-50 -mx-6 -mb-6 px-6 py-4.5">
                <span className="font-mono text-xs font-extrabold text-zinc-800 tracking-wider">
                  {offer.code}
                </span>
                <button
                  id={`copy-btn-${offer.code}`}
                  onClick={() => handleCopy(offer.code)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    copiedCode === offer.code
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {copiedCode === offer.code ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Our Story (About Us) */}
      <div className="bg-white rounded-3xl border border-zinc-100 p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-5 gap-10 items-center">
        
        {/* Story Illustration Side */}
        <div className="md:col-span-2 relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-50 shadow-inner">
          <img
            src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80"
            alt="The Empire Restaurant Kitchen"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex flex-col justify-end p-5 text-white">
            <span className="font-serif italic text-lg text-orange-400">"Legacy on every plate"</span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 mt-1">Est. 1998 — Bangalore, India</span>
          </div>
        </div>

        {/* Narrative Side */}
        <div className="md:col-span-3 space-y-5">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-orange-600 uppercase tracking-wider">
            Our Culinary Heritage
          </span>
          <h3 className="font-sans text-2xl font-extrabold text-zinc-950 tracking-tight sm:text-3xl">
            Sustaining the Flavours of Gourmet Craftsmanship
          </h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Founded with a passion to deliver authentic imperial recipes with a modern molecular twist, **The Empire** has been a beloved culinary landmark for over two decades. Under the master guidance of Head Chef Robert Empire, our kitchens prepare flame-grilled Ribeyes and signature entrees using secret organic spice mixes.
          </p>

          <p className="text-xs text-zinc-600 leading-relaxed">
            We operate with a **farm-to-table promise**, procuring 100% of our herbs, dairy products, and premium prime cuts directly from certified sustainable local farms. There are no preservatives, no artificial coloring—just sheer culinary passion on every single platter.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-3 text-center border-t border-zinc-100">
            <div className="space-y-1">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <ChefHat className="h-4.5 w-4.5" />
              </div>
              <span className="text-[11px] font-bold text-zinc-900 block">Expert Chefs</span>
              <span className="text-[9px] text-zinc-400 block">Michelin Guides</span>
            </div>
            <div className="space-y-1">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <Leaf className="h-4.5 w-4.5" />
              </div>
              <span className="text-[11px] font-bold text-zinc-900 block">Organic Only</span>
              <span className="text-[9px] text-zinc-400 block">100% Sustainable</span>
            </div>
            <div className="space-y-1">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <span className="text-[11px] font-bold text-zinc-900 block">Pure Hygiene</span>
              <span className="text-[9px] text-zinc-400 block">A-Grade Certified</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
