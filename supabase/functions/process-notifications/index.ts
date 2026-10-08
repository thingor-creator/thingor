// @ts-nocheck
// Supabase Edge Function: process-notifications
// Server-side scheduled job for processing warranty & financing alerts and sending emails securely

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase service configuration" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch site settings to ensure notifications are globally enabled
    const { data: siteSettings } = await supabase
      .from("site_settings")
      .select("notifications_enabled, email_notifications_enabled")
      .eq("id", "default")
      .maybeSingle();

    if (siteSettings && siteSettings.notifications_enabled === false) {
      return new Response(
        JSON.stringify({ message: "Notifications are globally disabled in Site Settings." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date(todayStr);

    let processedCount = 0;
    let emailsSent = 0;

    // 2. Fetch all items with warranty_end
    const { data: items } = await supabase
      .from("items")
      .select("id, user_id, name, warranty_end")
      .not("warranty_end", "is", null);

    if (items && items.length > 0) {
      for (const item of items) {
        if (!item.warranty_end || !item.user_id) continue;

        const warrantyDate = new Date(item.warranty_end);
        const diffMs = warrantyDate.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let alertThreshold: number | null = null;
        if (diffDays === 30) alertThreshold = 30;
        else if (diffDays === 14) alertThreshold = 14;
        else if (diffDays === 3) alertThreshold = 3;
        else if (diffDays === 0) alertThreshold = 0;

        if (alertThreshold !== null) {
          const dedupKey = `warranty:${item.id}:${alertThreshold}d`;
          const title =
            alertThreshold === 0
              ? `A garancia ma lejár!`
              : `Garancia lejárati figyelmeztetés (${alertThreshold} nap)`;
          const description =
            alertThreshold === 0
              ? `A(z) "${item.name}" tárgy garanciája a mai napon (${item.warranty_end}) lejár.`
              : `A(z) "${item.name}" tárgy garanciája ${alertThreshold} nap múlva lejár (${item.warranty_end}).`;

          // Insert notification safely with dedup_key
          const { error: insertError } = await supabase
            .from("notifications")
            .insert(
              [
                {
                  user_id: item.user_id,
                  title,
                  description,
                  type: "warranty",
                  reference_id: item.id,
                  dedup_key: dedupKey,
                  is_read: false,
                },
              ],
              { ignoreDuplicates: true }
            );

          if (!insertError) {
            processedCount++;
          }
        }
      }
    }

    // 3. Fetch all financings with next_payment_date
    const { data: financings } = await supabase
      .from("item_financings")
      .select("id, user_id, item_id, provider, monthly_installment, next_payment_date")
      .not("next_payment_date", "is", null);

    if (financings && financings.length > 0) {
      for (const fin of financings) {
        if (!fin.next_payment_date || !fin.user_id) continue;

        const paymentDate = new Date(fin.next_payment_date);
        const diffMs = paymentDate.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let alertThreshold: number | null = null;
        if (diffDays === 7) alertThreshold = 7;
        else if (diffDays === 3) alertThreshold = 3;
        else if (diffDays === 0) alertThreshold = 0;

        if (alertThreshold !== null) {
          const dedupKey = `financing:${fin.id}:${fin.next_payment_date}:${alertThreshold}d`;
          const title =
            alertThreshold === 0
              ? `Részletfizetés esedékes a mai napon!`
              : `Közelgő részletfizetés (${alertThreshold} nap)`;
          const description =
            alertThreshold === 0
              ? `A(z) esedékes havi részleted: ${fin.monthly_installment} Ft (${fin.provider || "Finanszírozás"}).`
              : `A esedékes havi részleted (${fin.monthly_installment} Ft) ${alertThreshold} nap múlva fizetendő (${fin.next_payment_date} - ${fin.provider || "Finanszírozás"}).`;

          const { error: insertError } = await supabase
            .from("notifications")
            .insert(
              [
                {
                  user_id: fin.user_id,
                  title,
                  description,
                  type: "financing",
                  reference_id: fin.id,
                  dedup_key: dedupKey,
                  is_read: false,
                },
              ],
              { ignoreDuplicates: true }
            );

          if (!insertError) {
            processedCount++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        emailsSent,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
