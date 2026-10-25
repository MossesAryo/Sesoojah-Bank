export interface Saving {
  id: string;
  userId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  goalId: string | null; // null = tabungan umum
  method: string; // id metode bayar, lihat METHODS di lib.ts
}

export interface Goal {
  id: string;
  userId: string; // pembuat target
  shared: boolean; // true = target berdua, false = target pribadi
  name: string;
  emoji: string;
  targetAmount: number;
  deadline: string | null; // YYYY-MM-DD
  createdAt: number;
}

export interface Profile {
  name: string;
}

export type Profiles = Record<string, Profile>;