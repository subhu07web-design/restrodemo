import React, { useState, useEffect, useRef } from "react";
import { Order, MenuItem, Category, OrderStatus } from "../types";
import {
  LogIn,
  Loader2,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Check,
  ClipboardList,
  Flame,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  ToggleLeft,
  ToggleRight,
  Bell,
  Volume2,
  VolumeX,
  PlusCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  addDoc,
  query,
  orderBy
} from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../firebase";
import { DEFAULT_MENU_ITEMS } from "../data/defaultMenu";

const AUTHORIZED_ADMIN_EMAILS = ["admin@restaurant.com", "daskajaldas780@gmail.com"];

interface AdminPanelProps {
  menuItems: MenuItem[];
  onRefreshMenu: () => void;
}

export default function AdminPanel({ menuItems, onRefreshMenu }: AdminPanelProps) {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState("");

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderStatusTab, setSelectedOrderStatusTab] = useState<OrderStatus | "All">("All");

  // Notifications State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<{ id: string; message: string; title: string }[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "default"
  );

  // Menu Editor state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [menuFormName, setMenuFormName] = useState("");
  const [menuFormPrice, setMenuFormPrice] = useState("");
  const [menuFormDesc, setMenuFormDesc] = useState("");
  const [menuFormCat, setMenuFormCat] = useState<Category>("Mains");
  const [menuFormImage, setMenuFormImage] = useState("");
  const [menuFormAvailable, setMenuFormAvailable] = useState(true);
  const [menuSaving, setMenuSaving] = useState(false);

  // Active view: "orders" or "menu"
  const [activeTab, setActiveTab] = useState<"orders" | "menu">("orders");

  // Track if initial orders loaded to avoid toast storm on startup
  const isInitialLoad = useRef(true);

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return unsub;
  }, []);

  // Request native system notification permissions
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await window.Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === "granted") {
          new window.Notification("System Alerts Enabled! 🔔", {
            body: "You will now receive system notifications for new customer orders.",
          });
        }
      } catch (err) {
        console.error("Error requesting notification permission:", err);
      }
    }
  };

  useEffect(() => {
    if (user && typeof window !== "undefined" && "Notification" in window) {
      if (window.Notification.permission === "default") {
        requestNotificationPermission();
      }
    }
  }, [user]);

  // Listen to Orders in real-time
  useEffect(() => {
    if (!user || !user.email || !AUTHORIZED_ADMIN_EMAILS.includes(user.email)) return;

    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const fetchedOrders: Order[] = [];
        let newOrderAdded = false;
        let latestOrder: Order | null = null;

        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" && !isInitialLoad.current) {
            newOrderAdded = true;
            latestOrder = change.doc.data() as Order;
          }
        });

        snapshot.forEach((docSnap) => {
          fetchedOrders.push(docSnap.data() as Order);
        });

        setOrders(fetchedOrders);
        isInitialLoad.current = false;

        // Trigger real-time visual and audio notifications for new orders
        if (newOrderAdded && latestOrder) {
          triggerOrderNotification(latestOrder);
        }
      },
      (error) => {
        console.error("Error listening to orders:", error);
      }
    );

    return unsub;
  }, [user]);

  // Audio / Speech / Toast Trigger
  const triggerOrderNotification = (order: Order) => {
    const speechText = `New order received from ${order.customerName} for a total of ${order.totalAmount.toFixed(0)} rupees.`;

    // Audio Synthesis (TTS) - satisfying "real time order notifications"
    if (soundEnabled && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }

    // Trigger Native Browser System Notification (allows background alerts even when not in tab)
    if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
      try {
        const itemSummary = order.items.map(it => `${it.quantity}x ${it.name}`).join(", ");
        new window.Notification("🛎️ New Restaurant Order!", {
          body: `${order.customerName} ordered: ${itemSummary} for a total of ₹${order.totalAmount.toFixed(0)}`,
          tag: order.id,
          requireInteraction: true
        });
      } catch (err) {
        console.error("Failed to display native notification:", err);
      }
    }

    // Add visual toast
    const toastId = Math.random().toString();
    const newToast = {
      id: toastId,
      title: "🛎️ New Dining Order!",
      message: `${order.customerName} ordered ${order.items.reduce((sum, i) => sum + i.quantity, 0)} items (₹${order.totalAmount.toFixed(2)})`,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove toast after 7 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 7000);
  };

  // Default login action with fallback registration (on-demand sandbox provisioning)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError("Email and password are required.");
      return;
    }

    setIsLoggingIn(true);
    setAuthError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        // Automatically attempt to create the account if it is in the authorized admin list
        if (AUTHORIZED_ADMIN_EMAILS.includes(email)) {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
            // Write admin document to admins collection as well to ensure security rules pass
            const adminDocRef = doc(db, "admins", auth.currentUser?.uid || "admin_fallback");
            await setDoc(adminDocRef, {
              uid: auth.currentUser?.uid || "admin_fallback",
              email: email,
              role: "admin",
            });
          } catch (createErr: any) {
            setAuthError(createErr.message || "Credential generation failed.");
          }
        } else {
          setAuthError("Invalid credentials or unauthorized email.");
        }
      } else {
        setAuthError(err.message || "Failed to authenticate.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Order status progression
  const handleUpdateStatus = async (orderId: string, currentStatus: OrderStatus) => {
    let nextStatus: OrderStatus;
    if (currentStatus === "Pending") nextStatus = "Preparing";
    else if (currentStatus === "Preparing") nextStatus = "Out for Delivery";
    else if (currentStatus === "Out for Delivery") nextStatus = "Delivered";
    else return;

    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error updating order. Check security permissions.");
    }
  };

  // Reject / Cancel Order
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "Cancelled",
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Cancel failed:", err);
    }
  };

  // Save or edit menu item in Firestore
  const handleSaveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuFormName.trim() || !menuFormPrice.trim() || !menuFormImage.trim()) {
      alert("Please complete name, price, and image URL.");
      return;
    }

    setMenuSaving(true);
    try {
      const parsedPrice = parseFloat(menuFormPrice);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        alert("Please enter a valid positive price.");
        setMenuSaving(false);
        return;
      }

      const itemId = editingItem ? editingItem.id : "item_" + Math.random().toString(36).substring(2, 11);

      const itemPayload: MenuItem = {
        id: itemId,
        name: menuFormName.trim(),
        price: parsedPrice,
        category: menuFormCat,
        description: menuFormDesc.trim(),
        imageUrl: menuFormImage.trim(),
        isAvailable: menuFormAvailable,
      };

      await setDoc(doc(db, "menu_items", itemId), itemPayload);

      setIsMenuFormOpen(false);
      setEditingItem(null);
      resetMenuForm();
      onRefreshMenu();
    } catch (err) {
      console.error("Failed to save menu item:", err);
      alert("Failed to save menu item. Check database rules.");
    } finally {
      setMenuSaving(false);
    }
  };

  // Seed default menu if list is empty
  const handleSeedMenu = async () => {
    if (!window.confirm("Do you want to seed the database with The Empire's default premium menu items?")) return;
    try {
      for (const item of DEFAULT_MENU_ITEMS) {
        await setDoc(doc(db, "menu_items", item.id), item);
      }
      alert("Successfully seeded menu items!");
      onRefreshMenu();
    } catch (err) {
      console.error("Seeding failed", err);
      alert("Error seeding menu. Please check rules.");
    }
  };

  // Toggle availability from list
  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      const updated = !item.isAvailable;
      await updateDoc(doc(db, "menu_items", item.id), {
        isAvailable: updated,
      });
      onRefreshMenu();
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  // Delete MenuItem
  const handleDeleteMenuItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this menu item from The Empire?")) return;
    try {
      await deleteDoc(doc(db, "menu_items", itemId));
      onRefreshMenu();
    } catch (err) {
      console.error("Delete menu item failed:", err);
    }
  };

  const openEditMenuModal = (item: MenuItem) => {
    setEditingItem(item);
    setMenuFormName(item.name);
    setMenuFormPrice(item.price.toString());
    setMenuFormDesc(item.description);
    setMenuFormCat(item.category);
    setMenuFormImage(item.imageUrl);
    setMenuFormAvailable(item.isAvailable);
    setIsMenuFormOpen(true);
  };

  const resetMenuForm = () => {
    setMenuFormName("");
    setMenuFormPrice("");
    setMenuFormDesc("");
    setMenuFormCat("Mains");
    setMenuFormImage("");
    setMenuFormAvailable(true);
    setEditingItem(null);
  };

  // Filter orders by tab selection
  const filteredOrders = orders.filter((order) => {
    if (selectedOrderStatusTab === "All") return true;
    return order.status === selectedOrderStatusTab;
  });

  // Login Screen render
  if (!user || !user.email || !AUTHORIZED_ADMIN_EMAILS.includes(user.email)) {
    return (
      <div id="admin-login-screen" className="mx-auto max-w-md px-4 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-zinc-150 bg-white p-8 shadow-xl"
        >
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 mb-3">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="font-sans text-xl font-bold text-zinc-950">Administrative Access</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Provide authorization credentials to access The Empire backoffice dashboard.
            </p>
            
            <div className="mt-4 w-full rounded-xl bg-orange-50/70 border border-orange-100 p-3 text-left">
              <span className="block font-mono text-[9px] font-bold text-orange-800 uppercase tracking-wider mb-1">Authorized Admin Credentials:</span>
              <p className="text-[11px] text-orange-700/90 leading-relaxed font-mono">
                Email: <span className="font-bold text-orange-950">admin@restaurant.com</span><br />
                Password: <span className="font-bold text-orange-950">admin123</span>
              </p>
            </div>
          </div>

          {authError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Admin Username (Email)
              </label>
              <input
                id="admin-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@restaurant.com"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-850 placeholder-zinc-400 outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                Password
              </label>
              <input
                id="admin-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-850 placeholder-zinc-400 outline-none focus:border-orange-500"
              />
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={isLoggingIn}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-2.5 text-xs font-semibold text-white shadow-md shadow-orange-500/10 hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Enter Backoffice</span>
                </>
              )}
            </button>
          </form>

          {/* Prompt info */}
          <div className="mt-6 border-t border-zinc-100 pt-4 text-center">
            <p className="text-[10px] leading-relaxed text-zinc-400">
              💡 <strong>Instant Sandbox Access</strong>: We pre-filled the default system credential. Just click <strong>Enter Backoffice</strong> and our engine will auto-provision this administrator role in real-time.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Dashboard Main Render
  return (
    <div id="admin-dashboard-container" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Real-time floating alerts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-xs">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              id={`toast-${t.id}`}
              key={t.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-xl border border-orange-100 bg-white p-4 shadow-xl ring-1 ring-orange-500/5 flex gap-3"
            >
              <div className="flex-1">
                <h5 className="text-xs font-bold text-zinc-900">{t.title}</h5>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{t.message}</p>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                className="text-zinc-400 hover:text-zinc-600 h-fit"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-zinc-900 px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-white uppercase">
              backoffice
            </span>
            <button
              id="sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
              title={soundEnabled ? "Mute speech alerts" : "Unmute speech alerts"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-orange-500" />
                  <span className="font-mono text-orange-600 font-semibold">Sound On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  <span className="font-mono">Sound Muted</span>
                </>
              )}
            </button>

            <span className="text-zinc-300">|</span>

            <button
              id="notification-permission-btn"
              onClick={requestNotificationPermission}
              className="flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
              title="Request browser native notifications for order alerts"
            >
              {notificationPermission === "granted" ? (
                <div className="flex items-center gap-1 text-emerald-600">
                  <Bell className="h-3.5 w-3.5 animate-bounce" />
                  <span className="font-mono font-semibold">System Alerts On</span>
                </div>
              ) : notificationPermission === "denied" ? (
                <div className="flex items-center gap-1 text-red-500" title="Notifications blocked. Please allow them in your browser settings.">
                  <Bell className="h-3.5 w-3.5 opacity-50" />
                  <span className="font-mono font-semibold">Alerts Blocked</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-zinc-500 hover:text-orange-600">
                  <Bell className="h-3.5 w-3.5" />
                  <span className="font-mono font-semibold underline decoration-dotted">Enable System Alerts</span>
                </div>
              )}
            </button>
          </div>
          <h2 className="mt-1 font-sans text-2xl font-extrabold tracking-tight text-zinc-900">
            The Empire Master Control
          </h2>
          <p className="text-xs text-zinc-500">
            Monitor real-time customer dining queue, dispatch culinary orders, and maintain restaurant menu catalog.
          </p>
        </div>

        {/* View selection tabs */}
        <div className="flex rounded-xl bg-zinc-100 p-1 w-fit self-start">
          <button
            id="tab-orders"
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "orders" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Customer Orders ({orders.length})</span>
          </button>
          <button
            id="tab-menu"
            onClick={() => setActiveTab("menu")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "menu" ? "bg-white text-zinc-950 shadow-xs" : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Manage Menu ({menuItems.length})</span>
          </button>
        </div>
      </div>

      {/* RENDER: ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {/* Order Queue Filters */}
          <div className="flex flex-wrap gap-2 border-b border-zinc-100 pb-4">
            {(["All", "Pending", "Preparing", "Out for Delivery", "Delivered", "Cancelled"] as const).map((tab) => {
              const count = tab === "All" ? orders.length : orders.filter((o) => o.status === tab).length;
              return (
                <button
                  id={`order-tab-${tab.replace(/\s+/g, "-").toLowerCase()}`}
                  key={tab}
                  onClick={() => setSelectedOrderStatusTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedOrderStatusTab === tab
                      ? "bg-orange-50 text-orange-600 font-semibold"
                      : "bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200"
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {/* Orders queue grid */}
          {filteredOrders.length === 0 ? (
            <div id="no-orders-msg" className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/20">
              <ClipboardList className="h-8 w-8 text-zinc-300" />
              <h4 className="mt-4 text-sm font-semibold text-zinc-900">No matching orders</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Awaiting new customer reservations and dining cart submissions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {filteredOrders.map((order) => {
                const stepIdx = ["Pending", "Preparing", "Out for Delivery", "Delivered", "Cancelled"].indexOf(order.status);
                return (
                  <motion.div
                    id={`admin-order-card-${order.id}`}
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-zinc-150 bg-white p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-zinc-950">
                            ID: {order.id.replace("order_", "")}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
                              order.status === "Pending"
                                ? "bg-amber-100 text-amber-700"
                                : order.status === "Preparing"
                                ? "bg-orange-100 text-orange-700"
                                : order.status === "Out for Delivery"
                                ? "bg-blue-100 text-blue-700"
                                : order.status === "Delivered"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <h4 className="text-[10px] font-mono text-zinc-400 mt-1">
                          Placed on {new Date(order.createdAt).toLocaleString()}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-sm font-extrabold text-orange-600 block">
                          ₹{order.totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info Box */}
                    <div className="rounded-xl bg-zinc-50/70 p-3 space-y-1.5 text-xs text-zinc-600">
                      <div className="flex justify-between">
                        <strong className="text-zinc-800">Customer:</strong>
                        <span>{order.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <strong className="text-zinc-800">Contact:</strong>
                        <span>{order.customerPhone} | {order.customerEmail}</span>
                      </div>
                      <div className="flex flex-col pt-1 border-t border-zinc-150">
                        <strong className="text-zinc-800 mb-0.5">Delivery Address:</strong>
                        <span className="leading-relaxed font-sans">{order.deliveryAddress}</span>
                      </div>
                    </div>

                    {/* Order items checklist */}
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">Items List</h5>
                      {order.items.map((it) => (
                        <div key={it.id} className="flex justify-between items-center text-xs text-zinc-700">
                          <span className="flex items-center gap-1">
                            <strong className="text-zinc-900 font-bold bg-zinc-100 px-1.5 py-0.5 rounded text-[10px]">
                              x{it.quantity}
                            </strong>
                            {it.name}
                          </span>
                          <span className="font-mono text-zinc-500">₹{(it.price * it.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100 gap-2">
                      {order.status !== "Delivered" && order.status !== "Cancelled" ? (
                        <>
                          <button
                            id={`admin-cancel-btn-${order.id}`}
                            onClick={() => handleCancelOrder(order.id)}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Cancel</span>
                          </button>

                          <button
                            id={`admin-next-status-${order.id}`}
                            onClick={() => handleUpdateStatus(order.id, order.status)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-all shadow-xs"
                          >
                            {order.status === "Pending" && (
                              <>
                                <Flame className="h-4 w-4 animate-pulse" />
                                <span>Start Preparing</span>
                              </>
                            )}
                            {order.status === "Preparing" && (
                              <>
                                <Truck className="h-4 w-4" />
                                <span>Dispatch Courier</span>
                              </>
                            )}
                            {order.status === "Out for Delivery" && (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                <span>Mark Delivered</span>
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-400 italic">
                          Order lifecycle finalized. No further actions required.
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RENDER: MENU CATALOG TAB */}
      {activeTab === "menu" && (
        <div className="space-y-6">
          {/* Menu Maintenance Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-100 pb-4">
            <h3 className="text-sm font-bold text-zinc-900">Registered Empire Cuisine ({menuItems.length} items)</h3>
            <div className="flex gap-2">
              <button
                id="admin-seed-menu-btn"
                onClick={handleSeedMenu}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Seed Default Menu
              </button>
              <button
                id="admin-add-item-btn"
                onClick={() => {
                  resetMenuForm();
                  setIsMenuFormOpen(true);
                }}
                className="flex items-center gap-1 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Custom Dish</span>
              </button>
            </div>
          </div>

          {/* Catalog grid */}
          {menuItems.length === 0 ? (
            <div id="no-items-msg" className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/20">
              <ShoppingBag className="h-8 w-8 text-zinc-300" />
              <h4 className="mt-4 text-sm font-semibold text-zinc-900">Menu catalog is empty</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Click <strong>Seed Default Menu</strong> or add custom dishes to get started immediately.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-150 bg-white">
              <table id="menu-table" className="min-w-full divide-y divide-zinc-100 text-left text-xs text-zinc-600">
                <thead className="bg-zinc-50 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Dish</th>
                    <th className="px-6 py-3 font-semibold">Category</th>
                    <th className="px-6 py-3 font-semibold">Price</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {menuItems.map((item) => (
                    <tr id={`menu-row-${item.id}`} key={item.id} className="hover:bg-zinc-50/40">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 rounded-lg object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
                          }}
                        />
                        <div>
                          <strong className="text-zinc-950 font-bold block">{item.name}</strong>
                          <span className="text-[10px] text-zinc-400 line-clamp-1">{item.description}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-zinc-950">
                        ₹{item.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          id={`menu-row-toggle-${item.id}`}
                          onClick={() => handleToggleAvailable(item)}
                          className="text-zinc-400 hover:text-zinc-700 transition-colors"
                          title="Click to toggle availability"
                        >
                          {item.isAvailable ? (
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                              <ToggleRight className="h-5 w-5" />
                              Available
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-zinc-400">
                              <ToggleLeft className="h-5 w-5" />
                              Sold Out
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          id={`menu-row-edit-${item.id}`}
                          onClick={() => openEditMenuModal(item)}
                          className="text-zinc-400 hover:text-orange-500 p-1"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          id={`menu-row-delete-${item.id}`}
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="text-zinc-400 hover:text-red-500 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DIALOG: MENU FORM MODAL (Add / Edit) */}
      <AnimatePresence>
        {isMenuFormOpen && (
          <>
            <motion.div
              id="menu-form-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuFormOpen(false)}
              className="fixed inset-0 z-50 bg-black"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                id="menu-form-body"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="font-sans text-base font-bold text-zinc-950">
                    {editingItem ? "Modify Culinary Dish" : "Create New Dish"}
                  </h3>
                  <button
                    onClick={() => setIsMenuFormOpen(false)}
                    className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveMenuItem} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Dish Name *
                    </label>
                    <input
                      id="menu-form-name"
                      type="text"
                      required
                      value={menuFormName}
                      onChange={(e) => setMenuFormName(e.target.value)}
                      placeholder="e.g. Wagyu Ribeye Steak"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-850 placeholder-zinc-400 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                        Category *
                      </label>
                      <select
                        id="menu-form-cat"
                        value={menuFormCat}
                        onChange={(e) => setMenuFormCat(e.target.value as Category)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-850 outline-none focus:border-orange-500"
                      >
                        <option value="Starters">Starters</option>
                        <option value="Mains">Mains</option>
                        <option value="Desserts">Desserts</option>
                        <option value="Beverages">Beverages</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                        Price (INR) *
                      </label>
                      <input
                        id="menu-form-price"
                        type="number"
                        step="0.01"
                        required
                        value={menuFormPrice}
                        onChange={(e) => setMenuFormPrice(e.target.value)}
                        placeholder="e.g. 249.00"
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-850 placeholder-zinc-400 outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Photo Image URL *
                    </label>
                    <input
                      id="menu-form-image"
                      type="text"
                      required
                      value={menuFormImage}
                      onChange={(e) => setMenuFormImage(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-850 placeholder-zinc-400 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      Ingredients & Description
                    </label>
                    <textarea
                      id="menu-form-desc"
                      rows={3}
                      value={menuFormDesc}
                      onChange={(e) => setMenuFormDesc(e.target.value)}
                      placeholder="Describe flavours, ingredients, and allergen disclosures."
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-850 placeholder-zinc-400 outline-none focus:border-orange-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="menu-form-available"
                      type="checkbox"
                      checked={menuFormAvailable}
                      onChange={(e) => setMenuFormAvailable(e.target.checked)}
                      className="rounded border-zinc-300 text-orange-500 focus:ring-orange-500 h-4 w-4"
                    />
                    <label className="text-xs text-zinc-700 font-medium">Available to customers immediately</label>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                    <button
                      id="menu-form-cancel"
                      type="button"
                      onClick={() => setIsMenuFormOpen(false)}
                      className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                    <button
                      id="menu-form-submit"
                      type="submit"
                      disabled={menuSaving}
                      className="flex items-center gap-1 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      {menuSaving && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                      <span>{editingItem ? "Update Dish" : "Save Dish"}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
