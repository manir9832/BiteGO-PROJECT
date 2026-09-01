import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";

export type CartLine = {
  food_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type CartState = {
  restaurant_id: string | null;
  restaurant_name: string | null;
  lines: CartLine[];
};

const EMPTY: CartState = { restaurant_id: null, restaurant_name: null, lines: [] };
const KEY = "bitego.cart";

type PendingAdd = { food: any; restaurant: { id: string; name: string } } | null;

type CartCtx = {
  cart: CartState;
  count: number;
  subtotal: number;
  pendingConflict: PendingAdd;
  qtyOf: (foodId: string) => number;
  addItem: (food: any, restaurant: { id: string; name: string }) => void;
  decItem: (foodId: string) => void;
  setQty: (food: any, restaurant: { id: string; name: string }, qty: number) => void;
  clearConflict: () => void;
  confirmReplace: () => void;
  clearCart: () => void;
};

const Ctx = createContext<CartCtx>({} as CartCtx);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY);
  const [pendingConflict, setPending] = useState<PendingAdd>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await storage.getItem<string>(KEY, "");
      if (saved) { try { setCart(JSON.parse(saved)); } catch {} }
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (hydrated) storage.setItem(KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const applyAdd = (state: CartState, food: any, restaurant: { id: string; name: string }): CartState => {
    const lines = [...state.lines];
    const idx = lines.findIndex((l) => l.food_id === food.id);
    if (idx >= 0) lines[idx] = { ...lines[idx], quantity: lines[idx].quantity + 1 };
    else lines.push({ food_id: food.id, name: food.name, price: food.price, quantity: 1, image: food.image });
    return { restaurant_id: restaurant.id, restaurant_name: restaurant.name, lines };
  };

  const addItem = (food: any, restaurant: { id: string; name: string }) => {
    if (cart.restaurant_id && cart.restaurant_id !== restaurant.id && cart.lines.length > 0) {
      setPending({ food, restaurant });
      return;
    }
    setCart((s) => applyAdd(s, food, restaurant));
  };

  const decItem = (foodId: string) => {
    setCart((s) => {
      const lines = s.lines
        .map((l) => (l.food_id === foodId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0);
      if (lines.length === 0) return EMPTY;
      return { ...s, lines };
    });
  };

  const setQty = (food: any, restaurant: { id: string; name: string }, qty: number) => {
    if (qty <= 0) { decItem(food.id); return; }
    if (cart.restaurant_id && cart.restaurant_id !== restaurant.id && cart.lines.length > 0) {
      setPending({ food, restaurant });
      return;
    }
    setCart((s) => {
      const lines = [...s.lines];
      const idx = lines.findIndex((l) => l.food_id === food.id);
      if (idx >= 0) lines[idx] = { ...lines[idx], quantity: qty };
      else lines.push({ food_id: food.id, name: food.name, price: food.price, quantity: qty, image: food.image });
      return { restaurant_id: restaurant.id, restaurant_name: restaurant.name, lines };
    });
  };

  const confirmReplace = () => {
    if (!pendingConflict) return;
    const { food, restaurant } = pendingConflict;
    setCart(applyAdd(EMPTY, food, restaurant));
    setPending(null);
  };

  const count = cart.lines.reduce((a, l) => a + l.quantity, 0);
  const subtotal = cart.lines.reduce((a, l) => a + l.price * l.quantity, 0);
  const qtyOf = (foodId: string) => cart.lines.find((l) => l.food_id === foodId)?.quantity ?? 0;

  return (
    <Ctx.Provider value={{
      cart, count, subtotal, pendingConflict, qtyOf, addItem, decItem, setQty,
      clearConflict: () => setPending(null), confirmReplace,
      clearCart: () => setCart(EMPTY),
    }}>
      {children}
    </Ctx.Provider>
  );
}
