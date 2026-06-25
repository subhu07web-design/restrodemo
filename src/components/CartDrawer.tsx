import { CartItem } from "../types";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckoutOpen: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckoutOpen,
}: CartDrawerProps) {
  const subtotal = cartItems.reduce((acc, curr) => acc + curr.item.price * curr.quantity, 0);
  const deliveryFee = subtotal > 500 ? 0 : 49;
  const total = subtotal + deliveryFee;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black"
          />

          {/* Drawer Body */}
          <motion.div
            id="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-zinc-100 px-6">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-orange-500" />
                <h3 className="font-sans text-base font-bold text-zinc-950">Your Gourmet Selection</h3>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <button
                id="close-cart-btn"
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cartItems.length === 0 ? (
                <div id="cart-empty-message" className="flex h-full flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-orange-50 p-6 text-orange-500">
                    <ShoppingBag className="h-10 w-10" />
                  </div>
                  <h4 className="mt-4 font-sans text-sm font-semibold text-zinc-900">Your selection is empty</h4>
                  <p className="mt-1 max-w-[240px] text-xs text-zinc-500">
                    Add delicious dishes from our menu to start your curated dining experience.
                  </p>
                  <button
                    id="cart-shop-now-btn"
                    onClick={onClose}
                    className="mt-6 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 transition-colors"
                  >
                    Browse Cuisine
                  </button>
                </div>
              ) : (
                <div id="cart-items-container" className="space-y-4">
                  {cartItems.map(({ item, quantity }) => (
                    <motion.div
                      id={`cart-item-${item.id}`}
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="flex gap-3.5 border-b border-zinc-50 pb-4"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 rounded-xl object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      <div className="flex flex-1 flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h5 className="font-sans text-xs font-bold text-zinc-900 line-clamp-1">{item.name}</h5>
                            <span className="font-mono text-xs font-semibold text-zinc-900">
                              ₹{(item.price * quantity).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mt-0.5">{item.category}</p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 border border-zinc-150 rounded-lg p-1 bg-zinc-50/50">
                            <button
                              id={`cart-decrease-${item.id}`}
                              onClick={() => onUpdateQuantity(item.id, quantity - 1)}
                              className="rounded p-0.5 hover:bg-white text-zinc-500 hover:text-zinc-800 transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono text-xs font-bold text-zinc-800 w-5 text-center">{quantity}</span>
                            <button
                              id={`cart-increase-${item.id}`}
                              onClick={() => onUpdateQuantity(item.id, quantity + 1)}
                              className="rounded p-0.5 hover:bg-white text-zinc-500 hover:text-zinc-800 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <button
                            id={`cart-remove-${item.id}`}
                            onClick={() => onRemoveItem(item.id)}
                            className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                            title="Remove item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer calculations & checkout trigger */}
            {cartItems.length > 0 && (
              <div id="cart-summary-footer" className="border-t border-zinc-100 bg-zinc-50/50 p-6">
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Menu Subtotal</span>
                    <span className="font-mono font-medium text-zinc-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Delivery Fee</span>
                    <span className="font-mono font-medium text-zinc-900">
                      {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  {deliveryFee > 0 && (
                    <p className="text-[10px] text-orange-500">
                      💡 Add <strong className="font-semibold">₹{(500 - subtotal).toFixed(2)}</strong> more for free delivery!
                    </p>
                  )}
                  <div className="flex justify-between border-t border-zinc-150 pt-3 text-sm font-bold text-zinc-950">
                    <span>Order Total</span>
                    <span className="font-mono text-base font-extrabold text-orange-600">₹{total.toFixed(2)}</span>
                  </div>
                </div>

                <motion.button
                  id="cart-checkout-trigger-btn"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    onClose();
                    onCheckoutOpen();
                  }}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
