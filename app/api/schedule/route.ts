import { NextResponse } from "next/server";
import { getSchedule, REVALIDATE } from "@/lib/schedule";

// Fetch di server, jadi bebas CORS dan cache-nya kita yang atur.
export const revalidate = REVALIDATE;

export async function GET() {
  return NextResponse.json(await getSchedule());
}
