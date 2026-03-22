import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    console.log("ENV check - URL defined:", !!supabaseUrl, "SRK defined:", !!serviceRoleKey, "SRK length:", serviceRoleKey?.length);

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Debug: check if admin API is available
    console.log("adminClient.auth type:", typeof adminClient.auth);
    console.log("adminClient.auth.admin type:", typeof adminClient.auth.admin);
    console.log("adminClient.auth.admin keys:", adminClient.auth.admin ? Object.keys(adminClient.auth.admin) : "undefined");

    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, user_id, role, password } = await req.json();

    if (action === "change_role") {
      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "Missing user_id or role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot change your own role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error } = await adminClient.from("user_roles").update({ role }).eq("user_id", user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reset_password") {
      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "Missing user_id or password" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data, error } = await adminClient.auth.admin.updateUserById(user_id, { password });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "toggle_status") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot deactivate your own account" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: profile } = await adminClient.from("profiles").select("status").eq("id", user_id).single();
      const newStatus = profile?.status === "active" ? "inactive" : "active";
      
      const { error: profileError } = await adminClient.from("profiles").update({ status: newStatus }).eq("id", user_id);
      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (newStatus === "inactive") {
        await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
      } else {
        await adminClient.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      }

      return new Response(JSON.stringify({ success: true, status: newStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("manage-user error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
