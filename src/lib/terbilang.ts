const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = n % 10;
  return o ? `${t}-${ONES[o]}` : t;
}

function belowThousand(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (!h) return belowHundred(rest);
  if (!rest) return `${ONES[h]} hundred`;
  return `${ONES[h]} hundred and ${belowHundred(rest)}`;
}

const SCALES: Array<[number, string]> = [
  [1_000_000_000_000, "trillion"],
  [1_000_000_000, "billion"],
  [1_000_000, "million"],
  [1_000, "thousand"],
];

function toWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  for (const [value, name] of SCALES) {
    if (n >= value) {
      parts.push(`${toWords(Math.floor(n / value))} ${name}`);
      n %= value;
    }
  }
  if (n > 0) parts.push(belowThousand(n));
  return parts.join(" ");
}

/**
 * Amount in words for the "Pay :" line, e.g.
 * 22003378 -> "Twenty-two million three thousand three hundred and seventy-eight rupiah"
 */
export function amountInWords(n: number): string {
  const words = toWords(Math.round(Math.abs(n)));
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} rupiah`;
}

/**
 * Amount in words for USD invoices, e.g.
 * 1234.5 -> "One thousand two hundred and thirty-four US dollars and fifty cents"
 */
export function amountInWordsUsd(n: number): string {
  const abs = Math.abs(n);
  const dollars = Math.floor(abs);
  const cents = Math.round((abs - dollars) * 100);
  const words = toWords(dollars);
  let out = `${words.charAt(0).toUpperCase()}${words.slice(1)} US dollars`;
  if (cents > 0) out += ` and ${toWords(cents)} cents`;
  return out;
}
