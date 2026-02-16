import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getProfile, setProfile } from "@/lib/firebase-admin/firestore";

/** GET /api/v1/profile - Get current user's profile */
export async function GET() {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const profile = await getProfile(result.user.uid);
    return NextResponse.json(profile);
  } catch (err) {
    console.error("[api/profile GET]", err);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    );
  }
}

/** PUT /api/v1/profile - Save current user's profile */
export async function PUT(request: Request) {
  const result = await getSession();
  if (!result.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    first?: string;
    middle?: string;
    last?: string;
    birthday?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const profile = {
    first: typeof body.first === "string" ? body.first : "",
    middle: typeof body.middle === "string" ? body.middle : "",
    last: typeof body.last === "string" ? body.last : "",
    birthday: typeof body.birthday === "string" ? body.birthday : "",
  };
  try {
    await setProfile(result.user.uid, profile);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/profile PUT]", err);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 },
    );
  }
}
