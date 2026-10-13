/** Original colour keys ("--demand", "--c-solar") → themed CSS variables. */
export const cv = (key: string) => `var(--ch-${key.replace(/^--/, "")})`;
