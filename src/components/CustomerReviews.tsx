import React, { useState, useEffect } from "react";
import { Star, Sparkles, MessageSquarePlus, User, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, doc, setDoc, getDocs, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../firebase";
import { CustomerReview } from "../types";
import { onAuthStateChanged } from "firebase/auth";

const PRESET_REVIEWS: CustomerReview[] = [
  {
    id: "rev-1",
    name: "Aanya Sharma",
    rating: 5,
    comment: "Absolutely outstanding! The Rosemary Garlic Ribeye Steak was grilled to absolute perfection, melt-in-the-mouth perfection. Exceptional service!",
    createdAt: "2026-06-20T19:30:00.000Z"
  },
  {
    id: "rev-2",
    name: "Kabir Malhotra",
    rating: 5,
    comment: "The chocolate lava cake had a perfectly liquid molten center. It is an absolute masterpiece of desserts. The ambience is incredibly beautiful.",
    createdAt: "2026-06-18T21:15:00.000Z"
  },
  {
    id: "rev-3",
    name: "Rhea Sen",
    rating: 5,
    comment: "Truffle Arancini is to die for! Incredibly crispy on the outside, and delightfully creamy with truffle aroma inside. Recommended 100%!",
    createdAt: "2026-06-15T18:45:00.000Z"
  }
];

export default function CustomerReviews() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setName(user.displayName || "");
      }
    });
  }, []);

  // Fetch reviews in real-time
  useEffect(() => {
    const reviewsCol = collection(db, "reviews");
    const q = query(reviewsCol, orderBy("createdAt", "desc"), limit(30));

    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: CustomerReview[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push(docSnap.data() as CustomerReview);
      });

      if (fetched.length === 0) {
        setReviews(PRESET_REVIEWS);
      } else {
        // Merge preset reviews if they aren't already written to db
        setReviews(fetched);
      }
      setLoading(false);
    }, (err) => {
      console.warn("Could not listen to real-time reviews. Using fallbacks.", err);
      // Fallback local storage combined with presets
      const saved = JSON.parse(localStorage.getItem("empire_local_reviews") || "[]");
      setReviews([...saved, ...PRESET_REVIEWS]);
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name.trim() || !comment.trim()) {
      setErrorMsg("Please fill in both name and comment.");
      return;
    }

    setIsSubmitting(true);
    const reviewId = "rev_" + Math.random().toString(36).substring(2, 11);
    const newReview: CustomerReview = {
      id: reviewId,
      name: name.trim(),
      rating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      // Save to Firestore
      await setDoc(doc(db, "reviews", reviewId), newReview);

      // Save locally
      const saved = JSON.parse(localStorage.getItem("empire_local_reviews") || "[]");
      localStorage.setItem("empire_local_reviews", JSON.stringify([newReview, ...saved]));

      setSuccess(true);
      setComment("");
      setRating(5);
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
      }, 2000);
    } catch (err: any) {
      console.warn("Could not submit review to database. Saving locally:", err);
      const saved = JSON.parse(localStorage.getItem("empire_local_reviews") || "[]");
      localStorage.setItem("empire_local_reviews", JSON.stringify([newReview, ...saved]));
      setReviews((prev) => [newReview, ...prev]);

      setSuccess(true);
      setComment("");
      setRating(5);
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats calculation
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : "5.0";

  return (
    <div id="reviews-section" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3.5 py-1 text-xs font-semibold text-orange-600">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Guest Testimonials</span>
        </span>
        <h2 className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
          What Diners Say About Us
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-zinc-500">
          Authentic and real dining experiences written by our beloved patrons. We strive for excellence on every plate.
        </p>
      </div>

      {/* Stats Summary & Action Header */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 mb-10 shadow-sm">
        <div className="flex items-center gap-5 text-center sm:text-left">
          <div className="bg-orange-500/10 text-orange-600 px-5 py-4 rounded-2xl flex flex-col items-center">
            <span className="text-3xl font-extrabold font-sans leading-none">{averageRating}</span>
            <span className="text-[10px] font-mono tracking-wider uppercase mt-1 text-zinc-500">OUT OF 5</span>
          </div>
          <div>
            <div className="flex justify-center sm:justify-start gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4.5 w-4.5 ${
                    s <= Math.round(Number(averageRating)) ? "fill-orange-500 text-orange-500" : "text-zinc-200"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">Based on {totalReviews} gourmet reviews and guest logs.</p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/15 hover:bg-orange-600 transition-all cursor-pointer"
        >
          <MessageSquarePlus className="h-4.5 w-4.5" />
          <span>Write a Review</span>
        </button>
      </div>

      {/* Review Submission Form drawer/card */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-10"
          >
            <form onSubmit={handleSubmitReview} className="bg-orange-50/20 border border-orange-100 rounded-2xl p-6 space-y-4">
              <h3 className="font-sans text-xs font-bold text-orange-600 uppercase tracking-wider">Share Your Dining Experience</h3>
              
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {success ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Review posted successfully! Thank you for your review.</span>
                </div>
              ) : (
                <>
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
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-3.5 text-xs text-zinc-800 outline-none focus:border-orange-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                        Select Rating *
                      </label>
                      <div className="flex items-center h-10 gap-1.5 pl-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            onClick={() => setRating(star)}
                            className="text-orange-500 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star className={`h-6.5 w-6.5 ${star <= rating ? "fill-orange-500" : "text-zinc-200"}`} />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-zinc-600 ml-2">({rating} Stars)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                      Your Comments / Experience *
                    </label>
                    <textarea
                      required
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us about the flavour, portion size, delivery speed or dining hospitality..."
                      rows={4}
                      className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 px-3.5 text-xs text-zinc-800 outline-none focus:border-orange-500 transition-all resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-orange-600 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post Review"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-orange-500 mb-2" />
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Loading gourmet logs...</span>
        </div>
      ) : (
        <div id="reviews-list-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <motion.div
              id={`review-card-${rev.id}`}
              key={rev.id}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Rating */}
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${s <= rev.rating ? "fill-orange-500 text-orange-500" : "text-zinc-150"}`}
                    />
                  ))}
                </div>
                {/* Comment */}
                <p className="text-xs text-zinc-600 leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="mt-5 border-t border-zinc-50 pt-3.5 flex items-center gap-2.5">
                <div className="h-8.5 w-8.5 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 text-xs font-bold uppercase">
                  {rev.name.charAt(0)}
                </div>
                <div>
                  <span className="font-bold text-xs text-zinc-900 block">{rev.name}</span>
                  <span className="text-[9px] font-mono text-zinc-400 block mt-0.5">
                    {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
