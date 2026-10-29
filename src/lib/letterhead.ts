import { supabase } from "@/integrations/supabase/client";
import type { PrintDoctor } from "@/lib/prescriptionPrint";

/** Loads the signed-in doctor's letterhead data from their profile. */
export async function loadLetterhead(fallbackName = ""): Promise<PrintDoctor> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, gender, crm, crm_state, rqe, specialty, address, city, state, phone, clinic_name, clinic_phone, letterhead_logo_url")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  return {
    fullName: prof?.full_name || fallbackName,
    gender: prof?.gender,
    crm: prof?.crm,
    crmState: prof?.crm_state,
    rqe: prof?.rqe,
    specialty: prof?.specialty,
    address: prof?.address,
    city: prof?.city,
    state: prof?.state,
    phone: prof?.phone,
    clinicName: prof?.clinic_name,
    clinicPhone: prof?.clinic_phone,
    logoUrl: prof?.letterhead_logo_url,
  };
}
