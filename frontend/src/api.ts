

// BiteGo API client — JSON + FormData support

import { storage } from "@/src/utils/storage";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const BASE = `${BACKEND_URL}/api`;

const ACCESS = "bitego.access";
const REFRESH = "bitego.refresh";

let onLogout: () => void = () => {};

export const setOnLogout = (fn: () => void) => {
  onLogout = fn;
};

export async function saveTokens(access: string, refresh: string) {
  await storage.secureSet(ACCESS, access);
  await storage.secureSet(REFRESH, refresh);
}

export async function clearTokens() {
  await storage.secureRemove(ACCESS);
  await storage.secureRemove(REFRESH);
}

export const getAccess = () =>
  storage.secureGet<string>(ACCESS, "");

export const getRefresh = () =>
  storage.secureGet<string>(REFRESH, "");

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh = await getRefresh();

  if (!refresh) return null;

  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refresh,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();

    await saveTokens(
      data.access_token,
      data.refresh_token
    );

    return data.access_token;
  } catch {
    return null;
  }
}

type Opts = {
  method?: string;
  body?: any;
  auth?: boolean;
  params?: Record<string, any>;
};

export async function apiFetch<T = any>(
  path: string,
  opts: Opts = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    params,
  } = opts;

  let url = `${BASE}${path}`;

  if (params) {
    const qs = Object.entries(params)
      .filter(
        ([, v]) =>
          v !== undefined &&
          v !== null &&
          v !== ""
      )
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(
            String(v)
          )}`
      )
      .join("&");

    if (qs) {
      url += `?${qs}`;
    }
  }

  const doCall = async (
    token: string | null
  ): Promise<Response> => {
    /*
     * IMPORTANT:
     * FormData must be sent directly.
     * Do NOT JSON.stringify(FormData).
     * Do NOT manually set Content-Type for FormData.
     */

    const isFormData =
      typeof FormData !== "undefined" &&
      body instanceof FormData;

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // JSON requests need Content-Type.
    // FormData requests must let fetch create
    // the multipart boundary automatically.
    if (!isFormData) {
      headers["Content-Type"] =
        "application/json";
    }

    if (auth && token) {
      headers.Authorization =
        `Bearer ${token}`;
    }

    return fetch(url, {
      method,
      headers,
      body:
        body !== undefined
          ? isFormData
            ? body
            : JSON.stringify(body)
          : undefined,
    });
  };

  let token = auth
    ? await getAccess()
    : null;

  let res = await doCall(token);

  // One-shot token refresh
  if (res.status === 401 && auth) {
    refreshing =
      refreshing ?? tryRefresh();

    const newToken =
      await refreshing;

    refreshing = null;

    if (newToken) {
      res = await doCall(newToken);
    } else {
      await clearTokens();
      onLogout();

      throw new Error(
        "Session expired. Please log in again."
      );
    }
  }

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    // No response body
  }

  if (!res.ok) {
    const msg =
      data?.detail ||
      data?.message ||
      "Something went wrong. Try again.";

    throw new Error(
      typeof msg === "string"
        ? msg
        : "Request failed"
    );
  }

  return data as T;
}


// API methods

export const api = {
  get: <T = any>(
    p: string,
    params?: Record<string, any>
  ) =>
    apiFetch<T>(p, {
      method: "GET",
      params,
    }),

  post: <T = any>(
    p: string,
    body?: any,
    auth = true
  ) =>
    apiFetch<T>(p, {
      method: "POST",
      body,
      auth,
    }),

  put: <T = any>(
    p: string,
    body?: any
  ) =>
    apiFetch<T>(p, {
      method: "PUT",
      body,
    }),

  // Existing method
  del: <T = any>(p: string) =>
    apiFetch<T>(p, {
      method: "DELETE",
    }),

  // Compatibility with screens using api.delete()
  delete: <T = any>(p: string) =>
    apiFetch<T>(p, {
      method: "DELETE",
    }),
};


// Image upload
// Sends multipart/form-data directly using fetch.

export async function uploadImage(
  imageSource: any,
  name = "image.jpg",
  type = "image/jpeg"
): Promise<string> {
  const token = await getAccess();

  let actualUri = "";

  if (typeof imageSource === "string") {
    actualUri = imageSource;
  } else if (
    imageSource &&
    typeof imageSource.uri === "string"
  ) {
    actualUri = imageSource.uri;
  }

  if (!actualUri) {
    throw new Error(
      "Invalid image selected."
    );
  }

  // Read selected image
  const response =
    await fetch(actualUri);

  if (!response.ok) {
    throw new Error(
      "Could not read selected image."
    );
  }

  const blob =
    await response.blob();

  const formData =
    new FormData();

  formData.append(
    "file",
    blob as any,
    name
  );

  const res = await fetch(
    `${BASE}/upload`,
    {
      method: "POST",

      headers: {
        Accept: "application/json",

        ...(token
          ? {
              Authorization:
                `Bearer ${token}`,
            }
          : {}),
      },

      // IMPORTANT:
      // Do not set Content-Type manually.
      // Do not stringify FormData.
      body: formData,
    }
  );

  const data =
    await res.json().catch(
      () => null
    );

  if (!res.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        "Upload failed. Please try again."
    );
  }

  const rawUrl =
    data.url ||
    data.path ||
    "";

  if (
    rawUrl.startsWith(
      "http://"
    ) ||
    rawUrl.startsWith(
      "https://"
    )
  ) {
    return rawUrl;
  }

  return `${BACKEND_URL}${rawUrl}`;
}