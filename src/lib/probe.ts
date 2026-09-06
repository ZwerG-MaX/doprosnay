/* Проверка доступности серверов из браузера (для статусов на экране входа).
   RTSP/UDP из браузера не прощупываются, поэтому опрашиваем HTTP-эндпоинты,
   представляющие каждый сервис: видео-мост MediaMTX, веб-клиент Mumble,
   healthcheck ONLYOFFICE и PostgREST для PostgreSQL. */

export interface ProbeResult {
  online: boolean;
  latencyMs: number | null;
}

export interface ProbeOptions {
  /** true — нужен читаемый ответ (res.ok); false — достаточно достижимости (no-cors). */
  cors?: boolean;
  timeoutMs?: number;
}

export async function probe(url: string, opts?: ProbeOptions): Promise<ProbeResult> {
  const { cors = false, timeoutMs = 5000 } = opts ?? {};
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      mode: cors ? "cors" : "no-cors",
      signal: ctrl.signal,
      cache: "no-store",
    });
    const latencyMs = Math.round(performance.now() - t0);
    /* no-cors: сервер ответил (opaque) = достигим. cors: проверяем res.ok. */
    const online = cors ? res.ok : true;
    return { online, latencyMs: online ? latencyMs : null };
  } catch {
    return { online: false, latencyMs: null };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Отрабатывает все проверки параллельно и вызывает onResult для каждой по готовности. */
export async function probeAll(
  targets: { key: string; url: string; cors?: boolean }[],
  onResult: (key: string, r: ProbeResult) => void,
): Promise<void> {
  await Promise.all(
    targets.map(async (t) => {
      const r = await probe(t.url, { cors: t.cors });
      onResult(t.key, r);
    }),
  );
}
