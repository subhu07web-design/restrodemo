import React, { useState, useEffect } from "react";
import { Calendar, Clock, Users, Sofa, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { TableReservation } from "../types";
import { onAuthStateChanged } from "firebase/auth";

export default function BookTable() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seatingArea, setSeatingArea] = useState<TableReservation["seatingArea"]>("Standard");
  const [specialRequests, setSpecialRequests] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [successBooking, setSuccessBooking] = useState<TableReservation | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setName(user.displayName || "");
        setEmail(user.email || "");
      }
    });
  }, []);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name.trim() || !email.trim() || !phone.trim() || !date || !time) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    setIsLoading(true);

    const reservationId = "res_" + Math.random().toString(36).substring(2, 11);
    const newReservation: TableReservation = {
      id: reservationId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      guests,
      date,
      time,
      seatingArea,
      specialRequests: specialRequests.trim() || undefined,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    if (currentUser) {
      newReservation.userId = currentUser.uid;
    }

    try {
      // Save in Firestore
      await setDoc(doc(db, "reservations", reservationId), newReservation);

      // Save locally as well
      const savedReservations = JSON.parse(localStorage.getItem("empire_reservations") || "[]");
      localStorage.setItem("empire_reservations", JSON.stringify([...savedReservations, newReservation]));

      setSuccessBooking(newReservation);
      // Reset fields
      setSpecialRequests("");
      setPhone("");
    } catch (err: any) {
      console.warn("Firestore reservation failed, saving to local state fallback:", err);
      // Fallback save locally if security rules or offline
      const savedReservations = JSON.parse(localStorage.getItem("empire_reservations") || "[]");
      localStorage.setItem("empire_reservations", JSON.stringify([...savedReservations, newReservation]));
      
      setSuccessBooking(newReservation);
    } finally {
      setIsLoading(false);
    }
  };

  const seatingAreas: { value: TableReservation["seatingArea"]; label: string; desc: string; icon: string }[] = [
    { value: "Standard", label: "Standard Hall", desc: "Elegant ambient dining area with smooth jazz music.", icon: "🍽️" },
    { value: "Window Side", label: "Window Side", desc: "Enjoy panoramic street views under golden warm lights.", icon: "🏙️" },
    { value: "Balcony", label: "The Balcony", desc: "Fresh open air seating with views of the evening skyline.", icon: "🌌" },
    { value: "VIP Lounge", label: "VIP Private Lounge", desc: "Intimate luxurious cubicle with premium butler service.", icon: "👑" },
  ];

  return (
    <div id="book-table-container" className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      
      {/* Title */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3.5 py-1 text-xs font-semibold text-orange-600">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Gourmet Seating Experience</span>
        </span>
        <h2 className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
          Reserve a Premium Table
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
          Experience world-class culinary masterpieces from our chefs in custom luxury environments tailored to your mood.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {successBooking ? (
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-2xl border border-orange-100 bg-orange-50/30 p-8 text-center shadow-lg max-w-xl mx-auto"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-sans text-xl font-bold text-zinc-900">Table Reservation Received!</h3>
            <p className="mt-1.5 text-xs text-zinc-500">
              We have reserved a beautiful spot for you in the <strong className="text-orange-500">{successBooking.seatingArea}</strong>.
            </p>

            <div className="mt-6 border-t border-b border-zinc-100 py-4 text-left grid grid-cols-2 gap-y-3 gap-x-4 text-xs font-medium text-zinc-700">
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Booking ID</span>
                <span className="font-mono">{successBooking.id}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Name</span>
                <span>{successBooking.name}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Guests</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-orange-500" /> {successBooking.guests} Persons</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Date & Time</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-orange-500" /> {successBooking.date} at {successBooking.time}</span>
              </div>
            </div>

            <p className="mt-5 text-[10px] text-zinc-400 leading-relaxed">
              * Note: Please arrive 10 minutes prior to your booking. Your table will be held for a maximum of 15 minutes past the scheduled time.
            </p>

            <button
              onClick={() => setSuccessBooking(null)}
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-600 transition-all cursor-pointer"
            >
              Book Another Table
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="booking-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-8"
          >
            {/* Form Column */}
            <form onSubmit={handleBooking} className="md:col-span-3 space-y-4 bg-white rounded-2xl border border-zinc-100 p-6 sm:p-8 shadow-sm">
              <h3 className="font-sans text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">Seating Details & Contact</h3>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 px-3.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 px-3.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 px-3.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Number of Guests *
                  </label>
                  <div className="relative">
                    <Users className="absolute top-2.5 left-3 h-4.5 w-4.5 text-zinc-400" />
                    <select
                      value={guests}
                      onChange={(e) => setGuests(parseInt(e.target.value))}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs text-zinc-800 outline-none focus:border-orange-500 focus:bg-white transition-all appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((num) => (
                        <option key={num} value={num}>{num} {num === 1 ? "Guest" : "Guests"}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Reservation Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute top-2.5 left-3 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-3.5 text-xs text-zinc-800 outline-none focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Preferred Time Slot *
                  </label>
                  <div className="relative">
                    <Clock className="absolute top-2.5 left-3 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs text-zinc-800 outline-none focus:border-orange-500 focus:bg-white transition-all appearance-none"
                    >
                      <option value="">Select Time</option>
                      {["11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"].map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                  Special requests or dietary notes (Optional)
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="E.g. Celebrating anniversary, vegetarian preferences, wheelchair access..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 px-3.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-orange-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 focus:outline-none transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reservation"}
              </button>
            </form>

            {/* Seating Areas Column */}
            <div className="md:col-span-2 space-y-3.5">
              <h3 className="font-sans text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Select Dining Ambience</h3>
              {seatingAreas.map((area) => (
                <button
                  type="button"
                  key={area.value}
                  onClick={() => setSeatingArea(area.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                    seatingArea === area.value
                      ? "border-orange-500 bg-orange-50/20 shadow-sm"
                      : "border-zinc-100 bg-white hover:border-zinc-200"
                  }`}
                >
                  <span className="text-2xl">{area.icon}</span>
                  <div>
                    <span className="font-bold text-xs text-zinc-900 block">{area.label}</span>
                    <span className="text-[10.5px] text-zinc-500 leading-relaxed block mt-0.5">{area.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
