const WAITS_MS = [1000, 2000, 4000];

/** Runs a request again, up to three times, while it is answered 503 (storage did not answer, try again). */
export async function retryWhenUnavailable<T>(request: () => Promise<T>, waitsMs: number[] = WAITS_MS): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status !== 503 || attempt >= waitsMs.length) throw error;
      await new Promise((resolve) => setTimeout(resolve, waitsMs[attempt]));
    }
  }
}
