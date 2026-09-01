// // BiteGo API client — token persistence + one-shot refresh on 401.
// import { Platform } from "react-native";
// import { storage } from "@/src/utils/storage";

// const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
// const ACCESS = "bitego.access";
// const REFRESH = "bitego.refresh";

// let onLogout: () => void = () => {};
// export const setOnLogout = (fn: () => void) => { onLogout = fn; };

// export async function saveTokens(access: string, refresh: string) {
//   await storage.secureSet(ACCESS, access);
//   await storage.secureSet(REFRESH, refresh);
// }
// export async function clearTokens() {
//   await storage.secureRemove(ACCESS);
//   await storage.secureRemove(REFRESH);
// }
// export const getAccess = () => storage.secureGet<string>(ACCESS, "");
// export const getRefresh = () => storage.secureGet<string>(REFRESH, "");

// let refreshing: Promise<string | null> | null = null;

// async function tryRefresh(): Promise<string | null> {
//   const refresh = await getRefresh();
//   if (!refresh) return null;
//   try {
//     const res = await fetch(`${BASE}/auth/refresh`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ refresh_token: refresh }),
//     });
//     if (!res.ok) return null;
//     const data = await res.json();
//     await saveTokens(data.access_token, data.refresh_token);
//     return data.access_token;
//   } catch {
//     return null;
//   }
// }

// type Opts = { method?: string; body?: any; auth?: boolean; params?: Record<string, any> };

// export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
//   const { method = "GET", body, auth = true, params } = opts;
//   let url = `${BASE}${path}`;
//   if (params) {
//     const qs = Object.entries(params)
//       .filter(([, v]) => v !== undefined && v !== null && v !== "")
//       .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
//       .join("&");
//     if (qs) url += `?${qs}`;
//   }

//   const doCall = async (token: string | null): Promise<Response> => {
//     const headers: Record<string, string> = { "Content-Type": "application/json" };
//     if (auth && token) headers.Authorization = `Bearer ${token}`;
//     return fetch(url, {
//       method,
//       headers,
//       body: body !== undefined ? JSON.stringify(body) : undefined,
//     });
//   };

//   let token = auth ? await getAccess() : null;
//   let res = await doCall(token);

//   if (res.status === 401 && auth) {
//     refreshing = refreshing ?? tryRefresh();
//     const newToken = await refreshing;
//     refreshing = null;
//     if (newToken) {
//       res = await doCall(newToken);
//     } else {
//       await clearTokens();
//       onLogout();
//       throw new Error("Session expired. Please log in again.");
//     }
//   }

//   let data: any = null;
//   try { data = await res.json(); } catch { /* no body */ }

//   if (!res.ok) {
//     const msg = data?.detail || data?.message || "Something went wrong. Try again.";
//     throw new Error(typeof msg === "string" ? msg : "Request failed");
//   }
//   return data as T;
// }

// export const api = {
//   get: <T = any>(p: string, params?: Record<string, any>) =>
//     apiFetch<T>(p, { method: "GET", params }),
//   post: <T = any>(p: string, body?: any, auth = true) =>
//     apiFetch<T>(p, { method: "POST", body, auth }),
//   put: <T = any>(p: string, body?: any) => apiFetch<T>(p, { method: "PUT", body }),
//   del: <T = any>(p: string) => apiFetch<T>(p, { method: "DELETE" }),
// };

// // Multipart image upload → returns a full, servable image URL.
// export async function uploadImage(
//   uri: string, name = "image.jpg", type = "image/jpeg",
// ): Promise<string> {
//   const token = await getAccess();
//   const form = new FormData();
//   if (Platform.OS === "web") {
//     const blob = await (await fetch(uri)).blob();
//     form.append("file", blob, name);
//   } else {
//     form.append("file", { uri, name, type } as any);
//   }
//   const res = await fetch(`${BASE}/upload`, {
//     method: "POST",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     body: form,
//   });
//   const data = await res.json().catch(() => null);
//   if (!res.ok) throw new Error(data?.detail || "Upload failed. Please try again.");
//   return `${process.env.EXPO_PUBLIC_BACKEND_URL}${data.url}`;
// }























// // BiteGo API client — token persistence + one-shot refresh on 401.
// import { Platform } from "react-native";
// import { storage } from "@/src/utils/storage";

// const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
// const ACCESS = "bitego.access";
// const REFRESH = "bitego.refresh";

// let onLogout: () => void = () => {};
// export const setOnLogout = (fn: () => void) => { onLogout = fn; };

// export async function saveTokens(access: string, refresh: string) {
//   await storage.secureSet(ACCESS, access);
//   await storage.secureSet(REFRESH, refresh);
// }
// export async function clearTokens() {
//   await storage.secureRemove(ACCESS);
//   await storage.secureRemove(REFRESH);
// }
// export const getAccess = () => storage.secureGet<string>(ACCESS, "");
// export const getRefresh = () => storage.secureGet<string>(REFRESH, "");

// let refreshing: Promise<string | null> | null = null;

// async function tryRefresh(): Promise<string | null> {
//   const refresh = await getRefresh();
//   if (!refresh) return null;
//   try {
//     const res = await fetch(`${BASE}/auth/refresh`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ refresh_token: refresh }),
//     });
//     if (!res.ok) return null;
//     const data = await res.json();
//     await saveTokens(data.access_token, data.refresh_token);
//     return data.access_token;
//   } catch {
//     return null;
//   }
// }

// type Opts = { method?: string; body?: any; auth?: boolean; params?: Record<string, any> };

// export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
//   const { method = "GET", body, auth = true, params } = opts;
//   let url = `${BASE}${path}`;
//   if (params) {
//     const qs = Object.entries(params)
//       .filter(([, v]) => v !== undefined && v !== null && v !== "")
//       .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
//       .join("&");
//     if (qs) url += `?${qs}`;
//   }

//   const doCall = async (token: string | null): Promise<Response> => {
//     const headers: Record<string, string> = { "Content-Type": "application/json" };
//     if (auth && token) headers.Authorization = `Bearer ${token}`;
//     return fetch(url, {
//       method,
//       headers,
//       body: body !== undefined ? JSON.stringify(body) : undefined,
//     });
//   };

//   let token = auth ? await getAccess() : null;
//   let res = await doCall(token);

//   if (res.status === 401 && auth) {
//     refreshing = refreshing ?? tryRefresh();
//     const newToken = await refreshing;
//     refreshing = null;
//     if (newToken) {
//       res = await doCall(newToken);
//     } else {
//       await clearTokens();
//       onLogout();
//       throw new Error("Session expired. Please log in again.");
//     }
//   }

//   let data: any = null;
//   try { data = await res.json(); } catch { /* no body */ }

//   if (!res.ok) {
//     const msg = data?.detail || data?.message || "Something went wrong. Try again.";
//     throw new Error(typeof msg === "string" ? msg : "Request failed");
//   }
//   return data as T;
// }

// export const api = {
//   get: <T = any>(p: string, params?: Record<string, any>) =>
//     apiFetch<T>(p, { method: "GET", params }),
//   post: <T = any>(p: string, body?: any, auth = true) =>
//     apiFetch<T>(p, { method: "POST", body, auth }),
//   put: <T = any>(p: string, body?: any) => apiFetch<T>(p, { method: "PUT", body }),
//   del: <T = any>(p: string) => apiFetch<T>(p, { method: "DELETE" }),
// };

// // Multipart image upload → returns a full, servable image URL.
// export async function uploadImage(
//   uri: string, name = "image.jpg", type = "image/jpeg",
// ): Promise<string> {
//   const token = await getAccess();
//   const form = new FormData();
//   if (Platform.OS === "web") {
//     const blob = await (await fetch(uri)).blob();
//     form.append("file", blob, name);
//   } else {
//     form.append("file", { uri, name, type } as any);
//   }
//   const res = await fetch(`${BASE}/upload`, {
//     method: "POST",
//     headers: token ? { Authorization: `Bearer ${token}` } : {},
//     body: form,
//   });
//   const data = await res.json().catch(() => null);
//   if (!res.ok) throw new Error(data?.detail || "Upload failed. Please try again.");
  
//   const rawUrl = data.url || data.path || "";
//   if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
//     return rawUrl;
//   }
  
//   return `${process.env.EXPO_PUBLIC_BACKEND_URL}${rawUrl}`;
// }




































// BiteGo API client — token persistence + one-shot refresh on 401.
import { Platform } from "react-native";
import { storage } from "@/src/utils/storage";

// এনভায়রনমেন্ট ভ্যারিয়েবল চেক ও ফলব্যাক ইউআরএল যুক্ত করা হলো
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://192.168.1.105:8000";
const BASE = `${BACKEND_URL}/api`;

const ACCESS = "bitego.access";
const REFRESH = "bitego.refresh";

let onLogout: () => void = () => {};
export const setOnLogout = (fn: () => void) => { onLogout = fn; };

export async function saveTokens(access: string, refresh: string) {
  await storage.secureSet(ACCESS, access);
  await storage.secureSet(REFRESH, refresh);
}
export async function clearTokens() {
  await storage.secureRemove(ACCESS);
  await storage.secureRemove(REFRESH);
}
export const getAccess = () => storage.secureGet<string>(ACCESS, "");
export const getRefresh = () => storage.secureGet<string>(REFRESH, "");

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh = await getRefresh();
  if (!refresh) return null;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await saveTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

type Opts = { method?: string; body?: any; auth?: boolean; params?: Record<string, any> };

export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, auth = true, params } = opts;
  let url = `${BASE}${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const doCall = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    return fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let token = auth ? await getAccess() : null;
  let res = await doCall(token);

  if (res.status === 401 && auth) {
    refreshing = refreshing ?? tryRefresh();
    const newToken = await refreshing;
    refreshing = null;
    if (newToken) {
      res = await doCall(newToken);
    } else {
      await clearTokens();
      onLogout();
      throw new Error("Session expired. Please log in again.");
    }
  }

  let data: any = null;
  try { data = await res.json(); } catch { /* no body */ }

  if (!res.ok) {
    const msg = data?.detail || data?.message || "Something went wrong. Try again.";
    throw new Error(typeof msg === "string" ? msg : "Request failed");
  }
  return data as T;
}

export const api = {
  get: <T = any>(p: string, params?: Record<string, any>) =>
    apiFetch<T>(p, { method: "GET", params }),
  post: <T = any>(p: string, body?: any, auth = true) =>
    apiFetch<T>(p, { method: "POST", body, auth }),
  put: <T = any>(p: string, body?: any) => apiFetch<T>(p, { method: "PUT", body }),
  del: <T = any>(p: string) => apiFetch<T>(p, { method: "DELETE" }),
};

// Multipart image upload → returns a full, servable image URL.
export async function uploadImage(
  uri: string, name = "image.jpg", type = "image/jpeg",
): Promise<string> {
  const token = await getAccess();
  const form = new FormData();
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, name);
  } else {
    form.append("file", { uri, name, type } as any);
  }
  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || "Upload failed. Please try again.");
  
  const rawUrl = data.url || data.path || "";
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }
  
  return `${BACKEND_URL}${rawUrl}`;
}