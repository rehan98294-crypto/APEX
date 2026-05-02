import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { insertOrderToDB, updateOrderInDB } from "@/lib/supabase";

export type OrderStatus = "processing" | "bought" | "sold";

export interface NFTOrder {
  order_id: string;
  nft_name: string;
  image_source: any;
  status: OrderStatus;
  profit: number;
  price: number;
  level: number;
  created_at: number;
  updated_at: number;
}

interface OrderContextType {
  orders: NFTOrder[];
  orderDataLoaded: boolean;
  createOrder: (data: Omit<NFTOrder, "order_id" | "created_at" | "updated_at">) => string;
  updateOrder: (order_id: string, updates: Partial<Omit<NFTOrder, "order_id" | "created_at">>) => void;
}

const OrderContext = createContext<OrderContextType>({
  orders: [],
  orderDataLoaded: false,
  createOrder: () => "",
  updateOrder: () => {},
});

function genId() {
  return (
    "ORD-" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).substr(2, 4).toUpperCase()
  );
}

const orderKey = (userId: string) => `apex_orders_v1_${userId}`;

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<NFTOrder[]>([]);
  const [orderDataLoaded, setOrderDataLoaded] = useState(false);

  // Load from AsyncStorage when user changes (login / logout / switch)
  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setOrderDataLoaded(true);
      return;
    }
    setOrderDataLoaded(false);
    AsyncStorage.getItem(orderKey(user.id)).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            setOrders(parsed);
            console.log("[OrderContext] Restored:", parsed.length, "orders for user", user.id);
          }
        } catch {}
      }
      setOrderDataLoaded(true);
    });
  }, [user?.id]);

  const save = (newOrders: NFTOrder[]) => {
    if (!user?.id) return;
    AsyncStorage.setItem(orderKey(user.id), JSON.stringify(newOrders));
  };

  const createOrder = (
    data: Omit<NFTOrder, "order_id" | "created_at" | "updated_at">
  ): string => {
    const order_id = genId();
    const now = Date.now();
    const nowISO = new Date(now).toISOString();

    const newOrder: NFTOrder = { ...data, order_id, created_at: now, updated_at: now };
    const newOrders = [newOrder, ...orders];

    setOrders(newOrders);
    save(newOrders);

    // Persist to Supabase with real user_id (fire-and-forget)
    insertOrderToDB({
      order_id,
      user_id: user?.id ?? "anonymous",
      nft_id: data.nft_name || "",
      status: data.status as "processing" | "bought" | "sold",
      profit: data.profit,
      price: data.price,
      level: data.level,
      created_at: nowISO,
      updated_at: nowISO,
    });

    return order_id;
  };

  const updateOrder = (
    order_id: string,
    updates: Partial<Omit<NFTOrder, "order_id" | "created_at">>
  ) => {
    const newOrders = orders.map((o) =>
      o.order_id === order_id ? { ...o, ...updates, updated_at: Date.now() } : o
    );

    setOrders(newOrders);
    save(newOrders);

    // Persist changes to Supabase (fire-and-forget)
    updateOrderInDB(order_id, {
      ...(updates.status && { status: updates.status as "processing" | "bought" | "sold" }),
      ...(updates.nft_name !== undefined && { nft_id: updates.nft_name }),
      ...(updates.profit !== undefined && { profit: updates.profit }),
      ...(updates.price !== undefined && { price: updates.price }),
      ...(updates.level !== undefined && { level: updates.level }),
    });
  };

  return (
    <OrderContext.Provider value={{ orders, orderDataLoaded, createOrder, updateOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  return useContext(OrderContext);
}
