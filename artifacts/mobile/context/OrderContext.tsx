import React, { createContext, useContext, useState } from "react";

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
    setOrders((prev) => [{ ...data, order_id, created_at: now, updated_at: now }, ...prev]);
    return order_id;
  };

  const updateOrder = (
    order_id: string,
    updates: Partial<Omit<NFTOrder, "order_id" | "created_at">>
  ) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order_id ? { ...o, ...updates, updated_at: Date.now() } : o
      )
    );
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
