
export const TERMS_VERSION = "2026-11-25";

// Ustaw true, dopóki dokumenty nie zostaną sprawdzone przez prawnika (na stronach pojawia się adnotacja).
export const LEGAL_DRAFT = true;

export const COMPANY = {
  name: "Pracownia Sanitarna JS Sp. z o.o.",
  address: "ul. Akacjowa 6, 89-606 Charzykowy, Polska",
  nip: process.env.NEXT_PUBLIC_COMPANY_NIP || "5552138791",
  krs: process.env.NEXT_PUBLIC_COMPANY_KRS || "0001095405",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "bezszumu9@gmail.com",
  site: "bez-szumu.pl",
};

export const PLANS = { monthly: "15 zł", yearly: "120 zł" };
