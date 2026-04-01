import React, { createContext, useContext, useState } from "react";
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
  createOrder: (data: Omit<NFTOrder, "order_id" | "created_at" | "updated_at">) => string;
  updateOrder: (order_id: string, updates: Partial<Omit<NFTOrder, "order_id" | "created_at">>) => void;
}

const OrderContext = createContext<OrderContextType>({
  orders: [],
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

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<NFTOrder[]>([]);

  const createOrder = (
    data: Omit<NFTOrder, "order_id" | "created_at" | "updated_at">
  ): string => {
    const order_id = genId();
    const now = Date.now();
    const nowISO = new Date(now).toISOString();

    // Update in-memory state immediately
    setOrders((prev) => [{ ...data, order_id, created_at: now, updated_at: now }, ...prev]);

    // Persist to Supabase (fire-and-forget)
    insertOrderToDB({
      order_id,
      user_id: "anonymous",
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
    // Update in-memory state immediately
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order_id ? { ...o, ...updates, updated_at: Date.now() } : o
      )
    );

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
    <OrderContext.Provider value={{ orders, createOrder, updateOrder }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  return useContext(OrderContext);
}
