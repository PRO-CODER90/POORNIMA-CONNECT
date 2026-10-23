/** Format an integer INR amount: 12450 -> "₹12,450" */
export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}
