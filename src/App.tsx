import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import MenuSection from "./components/MenuSection";
import CartDrawer from "./components/CartDrawer";
import CheckoutModal from "./components/CheckoutModal";
import OrderTracker from "./components/OrderTracker";
import AdminPanel from "./components/AdminPanel";
import CustomerLoginModal from "./components/CustomerLoginModal";
import BookTable from "./components/BookTable";
import CustomerReviews from "./components/CustomerReviews";
import SpecialOffers from "./components/SpecialOffers";
import { MenuItem, CartItem, Order } from "./types";
import { collection, getDocs, doc, setDoc, onSnapshot, query, limit } from "firebase/firestore";
import { db, auth, OperationType, handleFirestoreError } from "./firebase";
import { DEFAULT_MENU_ITEMS } from "./data/defaultMenu";
import { Sparkles, Utensils, Clock, Flame, Loader2, ArrowRight, Calendar, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged } from "firebase/auth";

export default function App() {
  // Navigation & Views State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  
  // Tab Navigation & Login
  const [activeTab, setActiveTab] = useState("menu");
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Firestore Menu State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  // Shopping Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Order Tracking State
  const [trackedOrderIds, setTrackedOrderIds] = useState<string[]>([]);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  // Load Menu items from Firestore
  const fetchMenu = async () => {
    setMenuLoading(true);
    try {
      const items: MenuItem[] = [];
      try {
        const querySnapshot = await getDocs(collection(db, "menu_items"));
        querySnapshot.forEach((docSnap) => {
          items.push(docSnap.data() as MenuItem);
        });
      } catch (innerErr) {
        console.warn("Firestore menu_items query failed, using local fallback catalog:", innerErr);
      }

      // Automatic Seeding Flow: If Firestore has no menu items, seed them automatically
      if (items.length === 0) {
        console.log("No menu items found. Seeding default premium items...");
        for (const defaultItem of DEFAULT_MENU_ITEMS) {
          try {
            await setDoc(doc(db, "menu_items", defaultItem.id), defaultItem);
          } catch (writeErr) {
            console.warn("Seeding item failed:", defaultItem.id, writeErr);
          }
          items.push(defaultItem);
        }
      }

      setMenuItems(items);
    } catch (err) {
      console.warn("Failed to load menu items from Firestore. Gracefully falling back to premium local dining catalog.", err);
      setMenuItems(DEFAULT_MENU_ITEMS);
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();

    // Listen to menu changes in real-time so custom modifications update instantly
    const unsub = onSnapshot(collection(db, "menu_items"), (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as MenuItem);
      });
      if (items.length > 0) {
        setMenuItems(items);
      }
    }, (err) => {
      console.warn("Real-time menu subscription failed (blocked by security rules). Using local state fallback.", err);
    });

    // Load tracked order IDs from localStorage
    const savedOrders = JSON.parse(localStorage.getItem("bistro_orders") || "[]");
    setTrackedOrderIds(savedOrders);

    return unsub;
  }, []);

  // Sync user's real-time orders if they log in
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        // Query orders that belong to this logged in email or uid
        const ordersQuery = query(collection(db, "orders"), limit(20));
        const unsub = onSnapshot(ordersQuery, (snapshot) => {
          const userOrderIds: string[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Order;
            if (data.customerEmail === user.email || data.userId === user.uid) {
              userOrderIds.push(data.id);
            }
          });
          // Merge with local storage tracked orders
          const localOrders = JSON.parse(localStorage.getItem("bistro_orders") || "[]");
          const uniqueIds = Array.from(new Set([...localOrders, ...userOrderIds]));
          setTrackedOrderIds(uniqueIds);
        }, (err) => {
          console.warn("Real-time order subscription failed (blocked by security rules).", err);
        });
        return unsub;
      }
    });
  }, []);

  // Cart operations
  const handleAddToCart = (item: MenuItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.item.id === itemId ? { ...i, quantity } : i))
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Callback when order is placed
  const handleOrderPlaced = (order: Order) => {
    setLastPlacedOrder(order);
    
    // Save full order object to localStorage for high reliability tracking
    const fullOrders = JSON.parse(localStorage.getItem("bistro_full_orders") || "{}");
    fullOrders[order.id] = order;
    localStorage.setItem("bistro_full_orders", JSON.stringify(fullOrders));

    setTrackedOrderIds((prev) => {
      const updated = Array.from(new Set([...prev, order.id]));
      localStorage.setItem("bistro_orders", JSON.stringify(updated));
      return updated;
    });
    setIsTrackerOpen(true);
  };

  // Count helper
  const cartQuantities = cartItems.reduce((acc, curr) => {
    acc[curr.item.id] = curr.quantity;
    return acc;
  }, {} as { [itemId: string]: number });

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div id="restaurant-app-root" className="min-h-screen bg-zinc-50/50 flex flex-col font-sans pb-16 md:pb-0">
      
      {/* Global Navbar */}
      <Navbar
        onAdminToggle={() => setIsAdminMode(!isAdminMode)}
        isAdminMode={isAdminMode}
        cartCount={totalCartCount}
        onCartOpen={() => setIsCartOpen(true)}
        onTrackOrderOpen={() => setIsTrackerOpen(true)}
        hasActiveOrders={trackedOrderIds.length > 0}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setIsAdminMode(false); }}
        onLoginOpen={() => setIsLoginOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          {isAdminMode ? (
            /* Admin Backoffice Dashboard view */
            <motion.div
              key="admin-panel"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPanel menuItems={menuItems} onRefreshMenu={fetchMenu} />
            </motion.div>
          ) : (
            /* Customer Experience views */
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === "menu" && (
                <>
                  {/* Hero Showcase Frame */}
                  <div id="hero-frame" className="relative overflow-hidden bg-zinc-900 py-12 text-white sm:py-20">
                    {/* Background artistic texture */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(249,115,22,0.15),rgba(255,255,255,0))]" />
                    
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        
                        {/* Text and Features Info */}
                        <div className="lg:col-span-7 space-y-6">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Artisanal & Modern Empire Cuisine</span>
                          </span>
                          <h1 className="font-sans text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-tight">
                            Flavours Crafted with Absolute <span className="text-orange-500">Passion</span>
                          </h1>
                          <p className="text-sm sm:text-base leading-relaxed text-zinc-400">
                            Indulge in a premium dining experience delivered hot and fresh directly to your doorstep. Explore our curated catalog of appetizers, signature mains, and custom desserts.
                          </p>

                          {/* Quick conversion CTA buttons */}
                          <div className="flex flex-wrap gap-4 pt-2">
                            <button
                              id="hero-order-online-btn"
                              onClick={() => {
                                const el = document.getElementById("menu-section");
                                if (el) {
                                  el.scrollIntoView({ behavior: "smooth" });
                                } else {
                                  setActiveTab("menu");
                                  setTimeout(() => {
                                    const el2 = document.getElementById("menu-section");
                                    if (el2) el2.scrollIntoView({ behavior: "smooth" });
                                  }, 100);
                                }
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 scale-100 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                              <Utensils className="h-4 w-4" />
                              <span>Order Online Now</span>
                            </button>
                            <button
                              id="hero-book-table-btn"
                              onClick={() => {
                                setActiveTab("book-table");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-transparent hover:bg-white/10 text-white border border-white/20 hover:border-white/40 px-6 py-3 text-xs sm:text-sm font-extrabold transition-all scale-100 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            >
                              <Calendar className="h-4 w-4 text-orange-400" />
                              <span>Book A Table</span>
                            </button>
                          </div>

                          {/* Quick features banner */}
                          <div className="flex flex-wrap gap-3 text-xs font-medium text-zinc-300 pt-2">
                            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800/50 px-3 py-1.5 border border-zinc-700/30">
                              <Utensils className="h-4 w-4 text-orange-500" />
                              <span>Flame Grilled</span>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800/50 px-3 py-1.5 border border-zinc-700/30">
                              <Clock className="h-4 w-4 text-orange-500" />
                              <span>30-Min Delivery</span>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800/50 px-3 py-1.5 border border-zinc-700/30">
                              <Flame className="h-4 w-4 text-orange-500" />
                              <span>Fresh & Hot</span>
                            </div>
                          </div>
                        </div>

                        {/* Beautiful Right-side Image Showcase */}
                        <div className="lg:col-span-5 relative">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15, duration: 0.4 }}
                            className="relative aspect-[4/3] sm:aspect-video lg:aspect-square w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-orange-500/5 group"
                          >
                            <img
                              src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80"
                              alt="The Empire Restaurant Dining Atmosphere"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
                            />
                            {/* Stylish gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            
                            {/* Overlaid details */}
                            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex items-end justify-between">
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                                  Signature Dining
                                </span>
                                <h4 className="text-xs sm:text-sm font-bold text-white font-sans">The Empire flagship ambience</h4>
                                <p className="text-[10px] text-zinc-300">Indiranagar, Bengaluru, India</p>
                              </div>
                              
                              <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1.5 text-center text-white shrink-0">
                                <span className="block text-xs font-black text-orange-400">4.9 ★</span>
                                <span className="block text-[8px] font-mono tracking-wider uppercase text-zinc-300">Top Rated</span>
                              </div>
                            </div>
                          </motion.div>

                          {/* Decorative geometric blur circles behind the photo */}
                          <div className="absolute -top-4 -left-4 -z-10 h-32 w-32 rounded-full bg-orange-500/20 blur-2xl" />
                          <div className="absolute -bottom-4 -right-4 -z-10 h-32 w-32 rounded-full bg-orange-600/15 blur-2xl" />
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Menu Display list */}
                  {menuLoading ? (
                    <div id="global-menu-loader" className="flex flex-col items-center justify-center py-24 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500 mb-3" />
                      <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                        Preparing artisanal catalog...
                      </span>
                    </div>
                  ) : (
                    <MenuSection
                      menuItems={menuItems}
                      onAddToCart={handleAddToCart}
                      cartQuantities={cartQuantities}
                    />
                  )}
                </>
              )}

              {activeTab === "book-table" && <BookTable />}
              {activeTab === "reviews" && <CustomerReviews />}
              {activeTab === "offers" && <SpecialOffers />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onCheckoutOpen={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Dialog Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onOrderPlaced={handleOrderPlaced}
        onClearCart={handleClearCart}
      />

      {/* Live Order tracking list */}
      <OrderTracker
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        orderIds={trackedOrderIds}
      />

      {/* Customer Login Modal */}
      <CustomerLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />

      {/* Footer Branding */}
      <footer id="app-footer" className="bg-white border-t border-zinc-100 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex justify-center items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-white shadow-md">
              <Utensils className="h-4.5 w-4.5" />
            </div>
            <span className="font-sans font-bold text-sm tracking-tight text-zinc-900">
              The Empire Dining Inc.
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            Every dish is made with organic ingredients sourced directly from sustainable local farms. Operating daily from 11:00 AM to 11:00 PM.
          </p>
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            © 2026 The Empire. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating Call & WhatsApp Buttons */}
      <div id="floating-contact-widgets" className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col gap-2.5 items-end">
        
        {/* WhatsApp Button */}
        <a
          id="floating-btn-whatsapp"
          href="https://wa.me/918822344281?text=Hello!%20I%20would%20like%20to%20place%20an%20order%20or%20book%20a%20table%20at%20The%20Empire."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#20ba56] text-white p-3 md:px-4 md:py-3 shadow-xl hover:shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer group"
          title="WhatsApp Us"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" className="h-5 w-5 fill-current">
            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
          </svg>
          <span className="hidden md:inline text-xs font-bold tracking-tight">WhatsApp Us</span>
        </a>
        
        {/* Call Button */}
        <a
          id="floating-btn-call"
          href="tel:8822344281"
          className="flex items-center gap-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white p-3 md:px-4 md:py-3 shadow-xl hover:shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer group"
          title="Call Us"
        >
          <Phone className="h-5 w-5 animate-pulse" />
          <span className="hidden md:inline text-xs font-bold tracking-tight">Call: 88223 44281</span>
        </a>

      </div>

    </div>
  );
}
