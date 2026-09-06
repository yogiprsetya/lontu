const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw {
      error: {
        code: data.error?.code || 'UNKNOWN_ERROR',
        message: data.error?.message || 'Request failed',
      },
    };
  }

  return data.data ?? data;
}

export const httpClient = {
  async get<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...init,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    return parseResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...init,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...init,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return parseResponse<T>(response);
  },

  async delete<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...init,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
    return parseResponse<T>(response);
  },
};

// SWR fetcher compatible with the API response format
export const swrFetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Request failed');
  }

  const data = await response.json();
  return data.data ?? data;
};
