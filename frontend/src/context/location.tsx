

// import React, { createContext, useContext, useEffect, useState } from "react";
// import * as Location from "expo-location";
// import { api } from "@/src/api";
// import { storage } from "@/src/utils/storage";

// export type Loc = { lat: number; lng: number; address: string };
// const KEY = "bitego.location";
// const DEFAULT: Loc = { lat: 22.5726, lng: 88.3639, address: "Kolkata, West Bengal" };

// type LocationCtx = {
//   loc: Loc;
//   available: boolean | null;
//   areaName: string | null;
//   checking: boolean;
//   permission: string | null;
//   setLocation: (l: Loc) => void;
//   detect: () => Promise<Loc | null>;
//   requestPermission: () => Promise<boolean>;
// };

// const Ctx = createContext<LocationCtx>({} as LocationCtx);
// export const useLocation = () => useContext(Ctx);

// export function LocationProvider({ children }: { children: React.ReactNode }) {
//   const [loc, setLoc] = useState<Loc>(DEFAULT);
//   const [available, setAvailable] = useState<boolean | null>(null);
//   const [areaName, setAreaName] = useState<string | null>(null);
//   const [checking, setChecking] = useState(true);
//   const [permission, setPermission] = useState<string | null>(null);

//   const matchArea = async (l: Loc) => {
//     try {
//       const res = await api.post<{ available: boolean; area: any }>(
//         "/service-areas/match", { lat: l.lat, lng: l.lng }, false);
//       setAvailable(res.available);
//       setAreaName(res.area?.name ?? null);
//     } catch { setAvailable(null); }
//   };

//   const setLocation = (l: Loc) => {
//     setLoc(l);
//     storage.setItem(KEY, JSON.stringify(l));
//     matchArea(l);
//   };

//   const requestPermission = async (): Promise<boolean> => {
//     const { status } = await Location.requestForegroundPermissionsAsync();
//     setPermission(status);
//     return status === "granted";
//   };

//   const detect = async (): Promise<Loc | null> => {
//     try {
//       const perm = await Location.getForegroundPermissionsAsync();
//       let status = perm.status;
//       if (status !== "granted") {
//         const req = await Location.requestForegroundPermissionsAsync();
//         status = req.status;
//       }
//       setPermission(status);
//       if (status !== "granted") return null;
      
//       const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
//       let address = "Current location";
//       try {
//         const geo = await Location.reverseGeocodeAsync({
//           latitude: pos.coords.latitude, longitude: pos.coords.longitude });
//         if (geo[0]) {
//           const g = geo[0];
//           // এখানে প্লাস কোড বা অপ্রয়োজনীয় ডিভিশন এড়িয়ে প্রপার স্ট্রিট, সাব-লোকালিটি বা সিটি ফিল্টার করা হয়েছে
//           const parts = [g.street, g.name, g.subregion || g.district, g.city].filter(
//             (p) => p && !p.includes("+") && !p.toLowerCase().includes("presidency")
//           );
//           address = parts.slice(0, 2).join(", ") || g.city || g.district || "Current location";
//         }
//       } catch {}
//       const l = { lat: pos.coords.latitude, lng: pos.coords.longitude, address };
//       setLocation(l);
//       return l;
//     } catch { return null; }
//   };

//   useEffect(() => {
//     (async () => {
//       const { status } = await Location.getForegroundPermissionsAsync();
//       if (status === "granted") {
//         const liveLoc = await detect();
//         if (liveLoc) {
//           setChecking(false);
//           return;
//         }
//       }

//       const saved = await storage.getItem<string>(KEY, "");
//       let l = DEFAULT;
//       if (saved) { try { l = JSON.parse(saved); } catch {} }
//       setLoc(l);
//       await matchArea(l);
//       setChecking(false);
//     })();
//   }, []);

//   return (
//     <Ctx.Provider value={{ loc, available, areaName, checking, permission,
//       setLocation, detect, requestPermission }}>
//       {children}
//     </Ctx.Provider>
//   );
// }














import React, { createContext, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { api } from "@/src/api";
import { storage } from "@/src/utils/storage";

export type Loc = { lat: number; lng: number; address: string };
const KEY = "bitego.location";
const DEFAULT: Loc = { lat: 22.5726, lng: 88.3639, address: "Kolkata, West Bengal" };

type LocationCtx = {
  loc: Loc;
  available: boolean | null;
  areaName: string | null;
  checking: boolean;
  permission: string | null;
  setLocation: (l: Loc) => void;
  detect: () => Promise<Loc | null>;
  requestPermission: () => Promise<boolean>;
};

const Ctx = createContext<LocationCtx>({} as LocationCtx);
export const useLocation = () => useContext(Ctx);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [loc, setLoc] = useState<Loc>(DEFAULT);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [areaName, setAreaName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [permission, setPermission] = useState<string | null>(null);

  const matchArea = async (l: Loc) => {
    try {
      const res = await api.post<{ available: boolean; area: any }>(
        "/service-areas/match", { lat: l.lat, lng: l.lng }, false);
      setAvailable(res.available);
      setAreaName(res.area?.name ?? null);
    } catch { setAvailable(null); }
  };

  const setLocation = (l: Loc) => {
    setLoc(l);
    storage.setItem(KEY, JSON.stringify(l));
    matchArea(l);
  };

  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermission(status);
    return status === "granted";
  };

  const detect = async (): Promise<Loc | null> => {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      let status = perm.status;
      if (status !== "granted") {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      setPermission(status);
      if (status !== "granted") return null;
      
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let address = "Current location";
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (geo[0]) {
          const g = geo[0];
          // প্লাস কোড বা অপ্রয়োজনীয় ডিভিশন এড়িয়ে প্রপার এলাকার নাম ফিল্টার করা
          const parts = [g.name, g.street, g.subregion || g.district, g.city].filter(
            (p) => p && !p.includes("+") && !p.toLowerCase().includes("presidency")
          );
          address = parts.slice(0, 2).join(", ") || g.city || g.district || "Current location";
        }
      } catch {}
      const l = { lat: pos.coords.latitude, lng: pos.coords.longitude, address };
      setLocation(l);
      return l;
    } catch { return null; }
  };

  useEffect(() => {
    (async () => {
      // পুরনো ক্যাশ বা স্টোরেজ ফাইল ডিলিট করে দিয়ে সরাসরি লাইভ জিপিএস লোকেশন নিতে বাধ্য করা হচ্ছে
      await storage.removeItem(KEY);
      
      const liveLoc = await detect();
      if (!liveLoc) {
        // যদি জিপিএস ফেইল করে তবেই ডিফল্ট ফলব্যাক ব্যবহার করবে
        setLoc(DEFAULT);
        await matchArea(DEFAULT);
      }
      setChecking(false);
    })();
  }, []);

  return (
    <Ctx.Provider value={{ loc, available, areaName, checking, permission,
      setLocation, detect, requestPermission }}>
      {children}
    </Ctx.Provider>
  );
}