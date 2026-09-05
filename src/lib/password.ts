import bcrypt from "bcryptjs";

export const PASSWORD_HASH_ROUNDS = 12;

const DUMMY_PASSWORD_HASH =
  "$2a$12$Dpzp2ywIoBFQTVjo2qH.r.qGGd36KlJ98l6dv8JYBX0uO0VXxGe3O";

export function getPasswordHashRounds(passwordHash: string): number | null {
  try {
    const rounds = bcrypt.getRounds(passwordHash);
    return Number.isInteger(rounds) && rounds >= 4 && rounds <= 31 ? rounds : null;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  try {
    const isValidHash = getPasswordHashRounds(hashed) !== null;
    const matches = await bcrypt.compare(plain, isValidHash ? hashed : DUMMY_PASSWORD_HASH);
    return isValidHash && matches;
  } catch {
    return false;
  }
}

export function needsPasswordRehash(passwordHash: string): boolean {
  const rounds = getPasswordHashRounds(passwordHash);
  return rounds === null || rounds < PASSWORD_HASH_ROUNDS;
}

export async function comparePasswordWithDummyHash(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
}
