
export const NATIVE_SOL = "SOL";
export const WRAPPED_SOL = "WSOL";

export function isNativeSol(token: string) {
  return token.toUpperCase() === NATIVE_SOL;
}

export function wrapSol(amount: number) {
  return amount;
}

export function unwrapSol(amount: number) {
  return amount;
}
