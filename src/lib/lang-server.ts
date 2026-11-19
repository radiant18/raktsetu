import { cookies } from "next/headers";
import { isLang, tr, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get("rs_lang")?.value;
  return isLang(v) ? v : "en";
}
export async function getT() {
  const l = await getLang();
  return (s: string) => tr(l, s);
}
