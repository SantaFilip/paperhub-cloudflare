// PaperHub API client — talks to the Cloudflare Worker.
//
// The shape (entities / auth / functions / integrations) mirrors what the app
// already calls, so page code didn't have to change when the backend moved.

const TOKEN_KEY = "ph_access_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  const response = await fetch(path, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    // An expired or revoked token should not keep failing every later call.
    if (response.status === 401) clearToken();
    throw new ApiError(response.status, payload?.error || `Request failed (${response.status})`, payload);
  }
  return payload;
}

/** Builds the entity accessors — same call signatures the Base44 SDK used. */
function entity(name) {
  const base = `/api/entities/${name}`;
  const query = (filter, sort, limit) => {
    const params = new URLSearchParams();
    if (filter && Object.keys(filter).length) params.set("filter", JSON.stringify(filter));
    if (sort) params.set("sort", sort);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return {
    list: (sort, limit) => request(query(null, sort, limit)),
    filter: (filter, sort, limit) => request(query(filter, sort, limit)),
    get: async (id) => (await request(query({ id }, null, 1)))[0] || null,
    create: (data) => request(base, { method: "POST", body: data }),
    update: (id, data) => request(`${base}/${id}`, { method: "PATCH", body: data }),
    delete: (id) => request(`${base}/${id}`, { method: "DELETE" }),
  };
}

export const api = {
  entities: {
    Presentations: entity("Presentations"),
    Comments: entity("Comments"),
    Ratings: entity("Ratings"),
    DownloadConsents: entity("DownloadConsents"),
    AuthorshipAuditLog: entity("AuthorshipAuditLog"),
  },

  auth: {
    me: () => request("/api/auth/me"),
    updateMe: (data) => request("/api/auth/me", { method: "PATCH", body: data }),

    register: ({ email, password }) => request("/api/auth/register", { method: "POST", body: { email, password } }),
    resendOtp: (email) => request("/api/auth/resend-otp", { method: "POST", body: { email } }),
    verifyOtp: async ({ email, otpCode }) => {
      const result = await request("/api/auth/verify-otp", { method: "POST", body: { email, otpCode } });
      if (result?.access_token) setToken(result.access_token);
      return result;
    },

    loginViaEmailPassword: async (email, password) => {
      const result = await request("/api/auth/login", { method: "POST", body: { email, password } });
      if (result?.access_token) setToken(result.access_token);
      return result;
    },

    resetPasswordRequest: (email) =>
      request("/api/auth/password-reset-request", { method: "POST", body: { email } }),
    resetPassword: ({ resetToken, newPassword }) =>
      request("/api/auth/password-reset", { method: "POST", body: { resetToken, newPassword } }),

    setToken,
    getToken,

    logout: (redirectTo = "/") => {
      clearToken();
      window.location.href = redirectTo;
    },
    redirectToLogin: (returnTo = window.location.pathname + window.location.search) => {
      window.location.href = `/login?returnTo=${encodeURIComponent(returnTo)}`;
    },
  },

  functions: {
    // Kept the `{ data }` envelope the SDK returned, so call sites read res.data.
    invoke: async (name, body) => ({ data: await request(`/api/functions/${name}`, { method: "POST", body }) }),
  },

  integrations: {
    Core: {
      UploadFile: ({ file }) => {
        const form = new FormData();
        form.append("file", file);
        return request("/api/files", { method: "POST", body: form, isForm: true });
      },
    },
  },

  // Base44 collected these; nothing consumes them now. Left as a no-op hook so
  // the call sites stay put if analytics comes back.
  analytics: {
    track: () => {},
  },
};

export default api;
