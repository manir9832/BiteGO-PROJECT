
// import React, { createContext, useContext, useEffect, useState } from "react";
// import { router } from "expo-router";
// import { Platform } from "react-native";
// import Constants, { ExecutionEnvironment } from "expo-constants";
// import * as Device from "expo-device";
// import { api, clearTokens, getAccess, getRefresh, saveTokens, setOnLogout } from "@/src/api";

// export type User = {
//   id: string;
//   phone?: string;
//   name?: string | null;
//   email?: string | null;
//   role: string;
//   profile_complete?: boolean;
// };

// type AuthCtx = {
//   user: User | null;
//   booting: boolean;
//   loginWithTokens: (a: string, r: string, u: User) => Promise<void>;
//   refreshUser: () => Promise<void>;
//   logout: () => Promise<void>;
// };

// const Ctx = createContext<AuthCtx>({} as AuthCtx);
// export const useAuth = () => useContext(Ctx);

// // এক্সপো গো চেক ও নোটিফিকেশন মডিউল ইমপোর্ট সেফ রাখার জন্য
// const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
// let Notifications: any = null;
// if (!isExpoGo) {
//   try {
//     Notifications = require("expo-notifications");
//   } catch (e) {
//     console.log("Notifications module not available", e);
//   }
// }

// // পুশ টোকেন কালেক্ট করে ব্যাকএন্ডে পাঠানোর ফাংশন
// async function registerAndSavePushToken() {
//   if (isExpoGo || !Notifications) return;
//   if (!Device.isDevice) return;

//   try {
//     const { status: existingStatus } = await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;

//     if (existingStatus !== 'granted') {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }

//     if (finalStatus !== 'granted') return;

//     const tokenData = await Notifications.getExpoPushTokenAsync();
//     const pushToken = tokenData.data;

//     // ব্যাকএন্ডে টোকেন সেভ করার জন্য API কল
//     await api.post('/users/push-token', { push_token: pushToken });
//     console.log("Push token registered & saved successfully!");
//   } catch (error) {
//     console.log("Error saving push token in Auth context:", error);
//   }
// }

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   const [user, setUser] = useState<User | null>(null);
//   const [booting, setBooting] = useState(true);

//   const logout = async () => {
//     const r = await getRefresh();
//     if (r) { try { await api.post("/auth/logout", { refresh_token: r }, false); } catch {} }
//     await clearTokens();
//     setUser(null);
//     router.replace("/(auth)/login");
//   };

//   useEffect(() => {
//     setOnLogout(() => { setUser(null); router.replace("/(auth)/login"); });
//     (async () => {
//       const token = await getAccess();
//       if (token) {
//         try {
//           const { user } = await api.get<{ user: User }>("/auth/me");
//           setUser(user);
//           // অ্যাপ রিস্টার্ট হওয়ার পর ইউজার লগড-ইন থাকলে টোকেন সেভ করবে
//           registerAndSavePushToken();
//         } catch { await clearTokens(); }
//       }
//       setBooting(false);
//     })();
//   }, []);

//   const loginWithTokens = async (a: string, r: string, u: User) => {
//     await saveTokens(a, r);
//     setUser(u);
//     // নতুন লগইন করার সাথে সাথে পুশ টোকেন সার্ভারে পাঠিয়ে দিবে
//     registerAndSavePushToken();
//   };

//   const refreshUser = async () => {
//     try { 
//       const { user } = await api.get<{ user: User }>("/auth/me"); 
//       setUser(user); 
//     } catch {}
//   };

//   return (
//     <Ctx.Provider value={{ user, booting, loginWithTokens, refreshUser, logout }}>
//       {children}
//     </Ctx.Provider>
//   );
// }





























import React, { createContext, useContext, useEffect, useState } from "react";

import { router } from "expo-router";

import { Platform } from "react-native";

import Constants, { ExecutionEnvironment } from "expo-constants";

import * as Device from "expo-device";

import {
  api,
  clearTokens,
  getAccess,
  getRefresh,
  saveTokens,
  setOnLogout,
} from "@/src/api";

export type User = {
  id: string;
  phone?: string;
  name?: string | null;
  email?: string | null;
  role: string;
  profile_complete?: boolean;
};

type AuthCtx = {
  user: User | null;
  booting: boolean;
  loginWithTokens: (a: string, r: string, u: User) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export const useAuth = () => useContext(Ctx);

// এক্সপো গো চেক ও নোটিফিকেশন মডিউল ইমপোর্ট সেফ রাখার জন্য
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
  } catch (e) {
    console.log("Notifications module not available", e);
  }
}

// পুশ টোকেন কালেক্ট করে ব্যাকএন্ডে পাঠানোর ফাংশন
async function registerAndSavePushToken() {
  if (isExpoGo || !Notifications) return;
  if (!Device.isDevice) return;

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    // EAS project ID নেওয়া
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.log("EAS projectId not found");
      return;
    }

    // Project ID সহ Expo Push Token নেওয়া
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const pushToken = tokenData.data;

    // ব্যাকএন্ডে টোকেন সেভ করার জন্য API কল
    await api.post("/users/push-token", {
      push_token: pushToken,
    });

    console.log("Push token registered & saved successfully!");
  } catch (error) {
    console.log("Error saving push token in Auth context:", error);
  }
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const logout = async () => {
    const r = await getRefresh();

    if (r) {
      try {
        await api.post(
          "/auth/logout",
          { refresh_token: r },
          false
        );
      } catch {}
    }

    await clearTokens();
    setUser(null);

    router.replace("/(auth)/login");
  };

  useEffect(() => {
    setOnLogout(() => {
      setUser(null);
      router.replace("/(auth)/login");
    });

    (async () => {
      const token = await getAccess();

      if (token) {
        try {
          const { user } = await api.get<{ user: User }>("/auth/me");

          setUser(user);

          // অ্যাপ রিস্টার্ট হওয়ার পর ইউজার লগড-ইন থাকলে টোকেন সেভ করবে
          registerAndSavePushToken();
        } catch {
          await clearTokens();
        }
      }

      setBooting(false);
    })();
  }, []);

  const loginWithTokens = async (
    a: string,
    r: string,
    u: User
  ) => {
    await saveTokens(a, r);

    setUser(u);

    // নতুন লগইন করার সাথে সাথে পুশ টোকেন সার্ভারে পাঠিয়ে দিবে
    registerAndSavePushToken();
  };

  const refreshUser = async () => {
    try {
      const { user } = await api.get<{ user: User }>("/auth/me");

      setUser(user);
    } catch {}
  };

  return (
    <Ctx.Provider
      value={{
        user,
        booting,
        loginWithTokens,
        refreshUser,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}