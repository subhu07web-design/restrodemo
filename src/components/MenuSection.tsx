import { useState } from "react";
import { MenuItem, Category } from "../types";
import { Plus, Search, Sparkles, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MenuSectionProps {
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  cartQuantities: { [itemId: string]: number };
}

const CATEGORIES: Category[] = ["Starters", "Mains", "Desserts", "Beverages"];

export default function MenuSection({ menuItems, onAddToCart, cartQuantities }: MenuSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="menu-section" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
          <Sparkles className="h-3 w-3" />
          <span>Curated Culinary Masterpieces</span>
        </span>
        <h2 className="mt-3 font-sans text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          Explore Our Exceptional Menu
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
          From flame-grilled prime cuts to refreshing artisanal beverages, every single plate is handcrafted with locally sourced premium ingredients.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-6">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            id="cat-tab-all"
            onClick={() => setSelectedCategory("All")}
            className={`relative rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
              selectedCategory === "All"
                ? "bg-orange-500 text-white shadow-md shadow-orange-500/10"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            All Dishes
          </button>
          {CATEGORIES.map((cat) => (
            <button
              id={`cat-tab-${cat.toLowerCase()}`}
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`relative rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                selectedCategory === cat
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/10"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-zinc-400" />
          <input
            id="menu-search-input"
            type="text"
            placeholder="Search our cuisine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs text-zinc-800 placeholder-zinc-400 outline-none transition-colors focus:border-orange-500"
          />
        </div>
      </div>

      {/* Menu Grid */}
      <AnimatePresence mode="popLayout">
        {filteredItems.length === 0 ? (
          <motion.div
            id="menu-empty-state"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="rounded-full bg-zinc-100 p-4 text-zinc-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-zinc-900">No dishes found</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Try adjusting your category filters or search queries.
            </p>
          </motion.div>
        ) : (
          <motion.div
            id="menu-grid"
            layout
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filteredItems.map((item) => {
              const countInCart = cartQuantities[item.id] || 0;
              return (
                <motion.div
                  id={`menu-item-card-${item.id}`}
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -4 }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Photo Container */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-50">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback image in case of broken URLs
                        e.currentTarget.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80";
                      }}
                    />
                    {/* Category Overlay */}
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-white/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-700 uppercase">
                      {item.category}
                    </span>
                    {/* Availability Overlay */}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                        <span className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex flex-1 flex-col pt-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-sans text-sm font-bold text-zinc-900 group-hover:text-orange-500 transition-colors">
                        {item.name}
                      </h4>
                      <span className="font-mono text-sm font-semibold text-zinc-900">
                        ₹{item.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                      {item.description}
                    </p>

                    {/* Bottom row actions */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-50">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                        {item.isAvailable ? "In Stock" : "Unavailable"}
                      </span>

                      {item.isAvailable && (
                        <button
                          id={`add-to-cart-btn-${item.id}`}
                          onClick={() => onAddToCart(item)}
                          className="flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add to Plate</span>
                          {countInCart > 0 && (
                            <span className="ml-1 rounded-full bg-orange-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                              {countInCart}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
