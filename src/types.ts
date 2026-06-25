export type Category = "Starters" | "Mains" | "Desserts" | "Beverages";

export type OrderStatus = "Pending" | "Preparing" | "Out for Delivery" | "Delivered" | "Cancelled";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  isAvailable: boolean;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: Category;
  imageUrl: string;
}

export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: "admin";
}

export interface TableReservation {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  guests: number;
  date: string;
  time: string;
  seatingArea: "Standard" | "Window Side" | "Balcony" | "VIP Lounge";
  specialRequests?: string;
  status: "Pending" | "Confirmed" | "Cancelled";
  createdAt: string;
}

export interface CustomerReview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
}

