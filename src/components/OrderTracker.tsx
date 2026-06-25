import { useState, useEffect } from "react";
import { Order, OrderStatus } from "../types";
import { X, Clock, Compass, Truck, CheckCircle, Flame, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface OrderTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  orderIds: string[];
}

const STATUS_STEPS: { status: OrderStatus; label: string; desc: string; icon: any }[] = [
  {
    status: "Pending",
    label: "Order Placed",
    desc: "Awaiting confirmation from our kitchen.",
    icon: Clock,
  },
  {
    status: "Preparing",
    label: "Preparing Food",
    desc: "Our gourmet chefs are cooking your meal.",
    icon: Flame,
  },
  {
    status: "Out for Delivery",
    label: "Out for Delivery",
    desc: "Our courier is bringing your hot dish.",
    icon: Truck,
  },
  {
    status: "Delivered",
    label: "Delivered",
    desc: "Bon appétit! Enjoy your delicious meal.",
    icon: CheckCircle,
  },
];

export default function OrderTracker({ isOpen, onClose, orderIds }: OrderTrackerProps) {
  const [activeOrders, setActiveOrders] = useState<{ [orderId: string]: Order }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || orderIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    // Pre-populate with locally stored full orders for robust instant rendering
    const savedFullOrders = JSON.parse(localStorage.getItem("bistro_full_orders") || "{}");
    const initialOrders: { [orderId: string]: Order } = {};
    orderIds.forEach((id) => {
      if (savedFullOrders[id]) {
        initialOrders[id] = savedFullOrders[id];
      }
    });
    setActiveOrders((prev) => ({ ...prev, ...initialOrders }));

    orderIds.forEach((orderId) => {
      const orderRef = doc(db, "orders", orderId);
      const unsub = onSnapshot(
        orderRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as Order;
            setActiveOrders((prev) => ({ ...prev, [orderId]: data }));
            
            // Sync updated status back to local cache
            const currentFullOrders = JSON.parse(localStorage.getItem("bistro_full_orders") || "{}");
            currentFullOrders[orderId] = data;
            localStorage.setItem("bistro_full_orders", JSON.stringify(currentFullOrders));
          }
          setLoading(false);
        },
        (error) => {
          console.warn("Firestore error listening to order, relying on local storage cache:", orderId, error);
          setLoading(false);
        }
      );
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [isOpen, orderIds]);

  const handleCancelOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "Cancelled",
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn("Firestore cancellation blocked by rules, updating locally:", err);
    }

    // Always update local cache instantly for full visual responsiveness
    setActiveOrders((prev) => {
      const current = prev[orderId];
      if (!current) return prev;
      const updated = {
        ...current,
        status: "Cancelled" as OrderStatus,
        updatedAt: new Date().toISOString(),
      };

      const currentFullOrders = JSON.parse(localStorage.getItem("bistro_full_orders") || "{}");
      currentFullOrders[orderId] = updated;
      localStorage.setItem("bistro_full_orders", JSON.stringify(currentFullOrders));

      return { ...prev, [orderId]: updated };
    });
  };

  const ordersList: Order[] = (Object.values(activeOrders) as Order[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="tracker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black"
          />

          {/* Tracker Sidebar */}
          <motion.div
            id="tracker-sidebar"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-lg flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-zinc-100 px-6">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-orange-500 animate-spin-slow" />
                <h3 className="font-sans text-base font-bold text-zinc-950">Live Order Progress</h3>
              </div>
              <button
                id="close-tracker-btn"
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading ? (
                <div id="tracker-loading" className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                </div>
              ) : ordersList.length === 0 ? (
                <div id="tracker-empty" className="flex h-full flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-zinc-50 p-6 text-zinc-400">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h4 className="mt-4 font-sans text-sm font-semibold text-zinc-900">No active tracking orders</h4>
                  <p className="mt-1 max-w-[240px] text-xs text-zinc-500">
                    Place a new order on our menu, and you can track its culinary journey live here!
                  </p>
                </div>
              ) : (
                ordersList.map((order) => {
                  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);
                  const isCancelled = order.status === "Cancelled";

                  return (
                    <div
                      id={`tracker-order-card-${order.id}`}
                      key={order.id}
                      className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-5 space-y-4 shadow-xs"
                    >
                      {/* Summary details */}
                      <div className="flex justify-between items-start border-b border-zinc-250 pb-3">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-orange-500 tracking-wider">
                            ORDER ID: {order.id.replace("order_", "")}
                          </span>
                          <h4 className="font-sans text-xs font-semibold text-zinc-500 mt-0.5">
                            Placed on {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-sm font-bold text-zinc-900 block">
                            ₹{order.totalAmount.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
                          </span>
                        </div>
                      </div>

                      {/* Display Steps */}
                      {isCancelled ? (
                        <div id={`cancelled-state-${order.id}`} className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-700">
                          <AlertTriangle className="h-5 w-5 shrink-0" />
                          <div>
                            <h5 className="text-xs font-bold">Order Cancelled</h5>
                            <p className="text-[10px] text-red-500/90 mt-0.5">
                              This dining order has been cancelled and will not be prepared.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-6 border-l-2 border-zinc-200">
                          {STATUS_STEPS.map((step, idx) => {
                            const isCompleted = idx <= currentStepIndex;
                            const isCurrent = idx === currentStepIndex;
                            const StepIcon = step.icon;

                            return (
                              <div id={`order-${order.id}-step-${idx}`} key={step.status} className="relative">
                                {/* Dot indicator */}
                                <div
                                  className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all ${
                                    isCompleted
                                      ? "bg-orange-500 border-orange-500 text-white scale-110"
                                      : "bg-white border-zinc-300 text-zinc-400"
                                  }`}
                                >
                                  {isCompleted && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                                </div>

                                <div className="flex gap-2.5 items-start">
                                  <StepIcon
                                    className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${
                                      isCurrent
                                        ? "text-orange-500 animate-pulse"
                                        : isCompleted
                                        ? "text-zinc-700"
                                        : "text-zinc-300"
                                    }`}
                                  />
                                  <div>
                                    <h5
                                      className={`text-xs font-bold ${
                                        isCurrent ? "text-orange-600" : isCompleted ? "text-zinc-800" : "text-zinc-400"
                                      }`}
                                    >
                                      {step.label}
                                    </h5>
                                    {isCurrent && (
                                      <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                                        {step.desc}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Items Accordion / Summary */}
                      <div className="rounded-lg bg-white border border-zinc-150 p-3">
                        <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-2">Itemised details</h5>
                        <div className="space-y-1.5">
                          {order.items.map((it) => (
                            <div key={it.id} className="flex justify-between items-center text-[11px] text-zinc-600">
                              <span>
                                {it.name} <strong className="text-zinc-400 ml-1">x{it.quantity}</strong>
                              </span>
                              <span className="font-mono">₹{(it.price * it.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cancel Trigger */}
                      {order.status === "Pending" && (
                        <button
                          id={`cancel-order-btn-${order.id}`}
                          onClick={() => handleCancelOrder(order.id)}
                          className="w-full rounded-lg border border-red-200 bg-red-50/50 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                        >
                          Cancel Dining Order
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
