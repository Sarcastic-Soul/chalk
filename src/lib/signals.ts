import "server-only";

export type Place = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode: string;
  label: string;
};

/** Open-Meteo geocoding (free, no key). */
export async function geocode(city: string): Promise<Place | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: {
      name: string;
      latitude: number;
      longitude: number;
      timezone: string;
      country_code: string;
      admin1?: string;
      country?: string;
    }[];
  };
  const r = data.results?.[0];
  if (!r) return null;
  return {
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    countryCode: r.country_code,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  };
}

export type DayWeather = {
  date: string;
  summary: string;
  maxC: number;
  minC: number;
  rainChance: number;
};

// WMO weather codes → plain words.
function describe(code: number): string {
  if (code === 0) return "clear and sunny";
  if (code <= 2) return "mostly sunny";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if (code >= 51 && code <= 57) return "drizzly";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rainy";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snowy";
  if (code >= 95) return "stormy";
  return "mixed";
}

export async function forecast(lat: number, lon: number, timezone: string): Promise<DayWeather[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=${encodeURIComponent(timezone)}&forecast_days=8`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const d = (await res.json()) as {
    daily?: {
      time: string[];
      weather_code: number[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
    };
  };
  if (!d.daily) return [];
  return d.daily.time.map((date, i) => ({
    date,
    summary: describe(d.daily!.weather_code[i]),
    maxC: Math.round(d.daily!.temperature_2m_max[i]),
    minC: Math.round(d.daily!.temperature_2m_min[i]),
    rainChance: d.daily!.precipitation_probability_max[i] ?? 0,
  }));
}

export type Holiday = { date: string; name: string };

/**
 * Nager.Date public holidays (free, no key). Some countries (e.g. India)
 * return 204 with no data; we fall back to a short list of widely observed dates.
 */
export async function holidays(countryCode: string, year: number): Promise<Holiday[]> {
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`, {
    next: { revalidate: 86400 },
  });
  if (res.status === 200) {
    const list = (await res.json()) as { date: string; localName: string; name: string }[];
    return list.map((h) => ({ date: h.date, name: h.name }));
  }
  return (FALLBACK[countryCode.toUpperCase()] ?? [])
    .filter((h) => h.date.startsWith(String(year)))
    .concat(GLOBAL.filter((h) => h.date.startsWith(String(year))));
}

const GLOBAL: Holiday[] = [
  { date: "2026-12-24", name: "Christmas Eve" },
  { date: "2026-12-25", name: "Christmas Day" },
  { date: "2026-12-31", name: "New Year's Eve" },
  { date: "2027-01-01", name: "New Year's Day" },
];

const FALLBACK: Record<string, Holiday[]> = {
  IN: [
    { date: "2026-11-14", name: "Children's Day" },
    { date: "2026-11-24", name: "Guru Nanak Jayanti" },
    { date: "2027-01-14", name: "Makar Sankranti / Pongal" },
    { date: "2027-01-26", name: "Republic Day" },
  ],
};
