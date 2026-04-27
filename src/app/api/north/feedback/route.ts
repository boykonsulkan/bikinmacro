import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

async function isAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  return userData?.role === "admin";
}

export async function GET() {
  try {
    const supabase = await createClient();
    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("feedback")
      .select(`
        *,
        users (
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Admin feedback fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    if (!(await isAdmin(supabase))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("feedback")
      .update({ status })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ message: "Feedback status updated" });
  } catch (error: any) {
    console.error("Admin feedback update error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
