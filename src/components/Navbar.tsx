import { ChefHat, ShoppingCart, ShieldAlert, FileText, Sparkles, UserCheck, LogOut, Utensils, Calendar, Star, Tag } from "lucide-react";
import { motion } from "motion/react";
import { auth } from "../firebase";
import { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";

interface NavbarProps {
  onAdminToggle: () => void;
  isAdminMode: boolean;
  cartCount: number;
  onCartOpen: () => void;
  onTrackOrderOpen: () => void;
  hasActiveOrders: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLoginOpen: () => void;
}

export default function Navbar({
  onAdminToggle,
  isAdminMode,
  cartCount,
  onCartOpen,
  onTrackOrderOpen,
  hasActiveOrders,
  activeTab,
  onTabChange,
  onLoginOpen,
}: NavbarProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const isAdminEmail = currentUser?.email?.toLowerCase() === "subhu07web@gmail.com";

  return (
    <>
    <nav id="app-navbar" className="sticky top-0 z-40 w-full border-b border-zinc-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => { if (isAdminMode) onAdminToggle(); else onTabChange("menu"); }}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-100 shrink-0">
            <ChefHat className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="font-sans font-bold text-base sm:text-lg tracking-tight text-zinc-900 block leading-tight">
              The <span className="text-orange-500">Empire</span>
            </span>
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider text-zinc-400 block -mt-0.5">
              Artisanal Dining
            </span>
          </div>
        </div>

        {/* Dynamic Navigation Tabs (Customer Mode Only - Hidden on Mobile, Shown on Desktop) */}
        {!isAdminMode && (
          <div className="hidden md:flex items-center gap-1 bg-zinc-100 border border-zinc-200/50 p-1 rounded-xl">
            <button
              id="tab-btn-menu"
              onClick={() => onTabChange("menu")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "menu" ? "bg-orange-500 text-white shadow-sm font-extrabold" : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
              }`}
            >
              Order Online
            </button>
            <button
              id="tab-btn-book-table"
              onClick={() => onTabChange("book-table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "book-table" ? "bg-orange-500 text-white shadow-sm font-extrabold" : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
              }`}
            >
              Book Table
            </button>
            <button
              id="tab-btn-reviews"
              onClick={() => onTabChange("reviews")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "reviews" ? "bg-orange-500 text-white shadow-sm font-extrabold" : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
              }`}
            >
              Reviews
            </button>
            <button
              id="tab-btn-offers"
              onClick={() => onTabChange("offers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "offers" ? "bg-orange-500 text-white shadow-sm font-extrabold" : "text-zinc-600 hover:text-zinc-900 hover:bg-white/50"
              }`}
            >
              Offers & Story
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Order Tracking Button */}
          {hasActiveOrders && (
            <motion.button
              id="nav-track-orders-btn"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onTrackOrderOpen}
              className="relative flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50/80 px-2 py-1 sm:px-3 sm:py-1.5 text-[10.5px] sm:text-xs font-medium text-orange-600 transition-colors hover:bg-orange-100"
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Track Orders</span>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
              </span>
            </motion.button>
          )}

          {/* Admin Toggle / Authentication indicator */}
          <button
            id="nav-admin-toggle-btn"
            onClick={onAdminToggle}
            className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10.5px] sm:text-xs font-medium transition-all ${
              isAdminMode
                ? "bg-zinc-900 text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">{isAdminMode ? "Exit Dashboard" : "Admin Dashboard"}</span>
            <span className="inline md:hidden">{isAdminMode ? "Exit" : "Admin"}</span>
          </button>

          {/* User auth state in navbar */}
          {currentUser ? (
            <div className="flex items-center gap-2 border-l border-zinc-200 pl-2 sm:pl-3">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[9px] font-mono text-zinc-400 leading-none">SIGNED IN</span>
                <span className="text-[11px] font-semibold text-zinc-700 max-w-[100px] truncate">
                  {currentUser.email}
                </span>
              </div>
              <button
                id="nav-logout-btn"
                onClick={handleLogout}
                title="Log Out"
                className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              id="nav-login-btn"
              onClick={onLoginOpen}
              className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 text-[10.5px] sm:text-xs font-bold hover:bg-orange-100 transition-colors cursor-pointer"
            >
              <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Login</span>
            </button>
          )}

          {/* Shopping Cart Button */}
          {!isAdminMode && (
            <motion.button
              id="nav-cart-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCartOpen}
              className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors cursor-pointer"
            >
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-zinc-900 text-[8px] sm:text-[10px] font-bold text-white ring-2 ring-white"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
          )}

        </div>
      </div>
    </nav>

    {/* Mobile Bottom Navigation Bar (Fixed at the bottom, only visible on screens smaller than md) */}
    {!isAdminMode && (
      <div id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-zinc-200/80 backdrop-blur-md px-2 py-2 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
        <button
          id="mobile-tab-btn-menu"
          onClick={() => onTabChange("menu")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === "menu" ? "text-orange-500 font-extrabold scale-105" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <Utensils className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold tracking-tight mt-0.5">Order</span>
        </button>
        <button
          id="mobile-tab-btn-book-table"
          onClick={() => onTabChange("book-table")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === "book-table" ? "text-orange-500 font-extrabold scale-105" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <Calendar className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold tracking-tight mt-0.5">Book</span>
        </button>
        <button
          id="mobile-tab-btn-reviews"
          onClick={() => onTabChange("reviews")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === "reviews" ? "text-orange-500 font-extrabold scale-105" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <Star className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold tracking-tight mt-0.5">Reviews</span>
        </button>
        <button
          id="mobile-tab-btn-offers"
          onClick={() => onTabChange("offers")}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === "offers" ? "text-orange-500 font-extrabold scale-105" : "text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <Tag className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold tracking-tight mt-0.5">Offers</span>
        </button>
      </div>
    )}
    </>
  );
}
