import React, { useState } from "react";
import { X, Mail, Lock, User, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../firebase";

interface CustomerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerLoginModal({ isOpen, onClose }: CustomerLoginModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    if (isRegister && !name.trim()) {
      setErrorMsg("Please provide your full name for registration.");
      setIsLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Register flow
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(userCred.user, { displayName: name.trim() });
        setSuccessMsg("Account created successfully! Welcome to The Empire.");
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Login flow
        await signInWithEmailAndPassword(auth, email.trim(), password);
        setSuccessMsg("Successfully logged in! Welcome back.");
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error("Auth failed:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setErrorMsg("Incorrect email or password. If you don't have an account, please switch to Register.");
      } else if (err.code === "auth/email-already-in-use") {
        setErrorMsg("This email is already in use. Please try logging in instead.");
      } else if (err.code === "auth/weak-password") {
        setErrorMsg("Password should be at least 6 characters.");
      } else {
        setErrorMsg(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 rounded-full p-1 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Title Header */}
              <div className="text-center mb-6">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="font-sans text-xl font-bold text-zinc-950">
                  {isRegister ? "Join The Empire" : "Welcome Back"}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {isRegister
                    ? "Create your gourmet account and access order tracking."
                    : "Sign in to manage and track your culinary orders."}
                </p>
              </div>

              {/* Error or Success Alerts */}
              {errorMsg && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-600">
                  {successMsg}
                </div>
              )}

              {/* Form fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute top-2.5 left-3 h-4.5 w-4.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={isRegister}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-orange-500 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute top-2.5 left-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="email"
                      placeholder="yourname@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute top-2.5 left-3 h-4.5 w-4.5 text-zinc-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 py-2.5 pl-10 pr-4 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 focus:outline-none disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isRegister ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              {/* Toggle state footer */}
              <div className="mt-6 text-center text-xs">
                <span className="text-zinc-500">
                  {isRegister ? "Already have an account?" : "New to The Empire?"}
                </span>{" "}
                <button
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="font-bold text-orange-500 hover:underline cursor-pointer"
                >
                  {isRegister ? "Log In" : "Register Now"}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
