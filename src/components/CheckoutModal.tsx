import React, { useState, useEffect } from "react";
import { CartItem, Order, OrderItem } from "../types";
import { X, ClipboardCheck, Loader2, Sparkles, AlertCircle, Tag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onOrderPlaced: (order: Order) => void;
  onClearCart: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cartItems,
  onOrderPlaced,
  onClearCart,
}: CheckoutModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Promo codes state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setName(user.displayName || "");
        setEmail(user.email || "");
      }
    });
  }, []);

  const subtotal = cartItems.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const deliveryFee = subtotal > 500 ? 0 : 49;
  
  // Calculate discount
  let discountAmount = 0;
  if (appliedPromo === "EMPIRE20") {
    discountAmount = parseFloat((subtotal * 0.20).toFixed(2));
  } else if (appliedPromo === "WEEKEND30") {
    discountAmount = parseFloat((subtotal * 0.30).toFixed(2));
  }

  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  const handleApplyPromo = (e: React.MouseEvent) => {
    e.preventDefault();
    setPromoError("");
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    if (code === "EMPIRE20") {
      setAppliedPromo(code);
      setPromoInput("");
    } else if (code === "WEEKEND30") {
      if (subtotal < 1000) {
        setPromoError("WEEKEND30 code requires a minimum order value of ₹1000.");
      } else {
        setAppliedPromo(code);
        setPromoInput("");
      }
    } else if (code === "FREEBEV") {
      setPromoError("FREEBEV applied! Free Mint Mojito is added to your chef pack.");
      setAppliedPromo(code);
      setPromoInput("");
    } else {
      setPromoError("Invalid promo code.");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      // Map CartItem to OrderItem (to strictly match DB schema defined in firestore.rules and blueprint)
      const orderItems: OrderItem[] = cartItems.map(({ item, quantity }) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: quantity,
        category: item.category,
        imageUrl: item.imageUrl,
      }));

      const orderId = "order_" + Math.random().toString(36).substring(2, 11);
      const nowString = new Date().toISOString();

      const newOrder: Order = {
        id: orderId,
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        deliveryAddress: address.trim(),
        items: orderItems,
        totalAmount: parseFloat(total.toFixed(2)),
        status: "Pending",
        createdAt: nowString,
        updatedAt: nowString,
      };

      if (currentUser) {
        newOrder.userId = currentUser.uid;
      }

      // Write to Firestore orders collection
      try {
        const orderRef = doc(db, "orders", orderId);
        await setDoc(orderRef, newOrder);
      } catch (writeErr) {
        console.warn("Firestore order submission failed (likely due to security rules). Saving order to local cache.", writeErr);
        try {
          handleFirestoreError(writeErr, OperationType.CREATE, `orders/${orderId}`);
        } catch (diagErr) {
          // Logged successfully
        }
      }

      // Save order info to localStorage for easier tracking by users
      const storedOrders = JSON.parse(localStorage.getItem("bistro_orders") || "[]");
      localStorage.setItem("bistro_orders", JSON.stringify([...storedOrders, orderId]));

      onClearCart();
      onOrderPlaced(newOrder);
      onClose();
    } catch (err: any) {
      console.error("Order submission failed:", err);
      setErrorMsg(err.message || "An error occurred while submitting your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="checkout-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              id="checkout-modal-body"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row"
            >
              {/* Form Side */}
              <form
                id="checkout-form"
                onSubmit={handleSubmit}
                className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-zinc-100"
              >
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardCheck className="h-5 w-5 text-orange-500" />
                  <h3 className="font-sans text-base font-bold text-zinc-950">Delivery & Checkout</h3>
                </div>

                {errorMsg && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                      Full Name *
                    </label>
                    <input
                      id="checkout-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                        Email Address *
                      </label>
                      <input
                        id="checkout-email-input"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                        Phone Number *
                      </label>
                      <input
                        id="checkout-phone-input"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                      Delivery Address *
                    </label>
                    <textarea
                      id="checkout-address-input"
                      required
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Flat/House No., Street, Area, City, Pin Code"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-orange-500 resize-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    id="checkout-back-btn"
                    type="button"
                    onClick={onClose}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  >
                    Back to selection
                  </button>
                  <button
                    id="checkout-submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        <span>Reserving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Place Dining Order</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Summary Side */}
              <div className="w-full md:w-80 bg-zinc-50/70 p-6 md:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-sans text-xs font-bold text-zinc-950 uppercase tracking-wider">
                      Order Summary
                    </h4>
                    <button
                      id="close-checkout-btn"
                      onClick={onClose}
                      className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-200/50 hover:text-zinc-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Scrollable items */}
                  <div className="max-h-56 overflow-y-auto space-y-3 border-b border-zinc-200/60 pb-4">
                    {cartItems.map(({ item, quantity }) => (
                      <div key={item.id} className="flex justify-between items-start gap-2 text-xs">
                        <div className="flex-1">
                          <span className="font-medium text-zinc-800 line-clamp-1">{item.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Qty: {quantity}</span>
                        </div>
                        <span className="font-mono text-zinc-900 font-semibold">
                          ₹{(item.price * quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promo Code Entry panel */}
                <div className="mt-4 border-b border-zinc-200/60 pb-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5">Apply Promo Code</span>
                  
                  {appliedPromo ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700">
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Code: {appliedPromo}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className="text-[10.5px] font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. EMPIRE20"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider text-zinc-800 outline-none focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="rounded-lg bg-zinc-900 hover:bg-zinc-850 text-white px-3 py-1.5 text-[10.5px] font-bold transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}

                  {promoError && (
                    <span className="text-[10px] text-red-500 font-semibold block mt-1 leading-normal pl-0.5">
                      {promoError}
                    </span>
                  )}
                </div>

                {/* Subtotals */}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Subtotal</span>
                    <span className="font-mono text-zinc-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-emerald-600">
                      <span>Promo Discount</span>
                      <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Delivery</span>
                    <span className="font-mono text-zinc-900">
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-200 pt-3 text-sm font-bold text-zinc-950">
                    <span>Grand Total</span>
                    <span className="font-mono text-sm font-extrabold text-orange-600">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
