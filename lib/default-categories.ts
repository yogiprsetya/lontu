type DefaultCategory =
  | { name: string; kind: "income" | "saving"; spendingType: null }
  | { name: string; kind: "spending"; spendingType: "needs" | "wants" };

const plain = (kind: "income" | "saving", names: string[]) =>
  names.map((name): DefaultCategory => ({ name, kind, spendingType: null }));
const spending = (spendingType: "needs" | "wants", names: string[]) =>
  names.map((name): DefaultCategory => ({ name, kind: "spending", spendingType }));

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  ...plain("income", ["Gaji", "Bonus", "Hadiah", "Lainnya"]),
  ...plain("saving", ["Dana Darurat", "Tabungan", "Investasi"]),
  ...spending("needs", ["Makan", "Transportasi", "Tagihan", "Belanja Bulanan", "Kesehatan"]),
  ...spending("wants", ["Hiburan", "Jajan", "Belanja", "Langganan"]),
];
