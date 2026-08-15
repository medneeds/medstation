import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WardUnit {
  id: string;
  name: string;
  kind: string;
  sort_order: number;
}

export interface WardBed {
  id: string;
  unit_id: string;
  label: string;
  sort_order: number;
}

export interface WardAdmission {
  id: string;
  bed_id: string | null;
  unit_id: string | null;
  patient_name: string;
  date_of_birth: string | null;
  record_number: string | null;
  admitted_on: string;
  main_diagnosis: string | null;
  comorbidities: string | null;
  notes: string | null;
  status: string;
  discharged_on: string | null;
  discharge_summary: string | null;
}

export interface WardRound {
  id: string;
  admission_id: string;
  round_date: string;
  content: string;
  status: string;
  origin: string;
}

export function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function daysOfStay(admittedOn: string, ref = todayISO()) {
  const a = new Date(`${admittedOn}T00:00:00`);
  const b = new Date(`${ref}T00:00:00`);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export function ageFromDob(dob?: string | null) {
  if (!dob) return null;
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function useWard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [units, setUnits] = useState<WardUnit[]>([]);
  const [beds, setBeds] = useState<WardBed[]>([]);
  const [admissions, setAdmissions] = useState<WardAdmission[]>([]);
  const [todayRounds, setTodayRounds] = useState<Record<string, WardRound>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [u, b, a] = await Promise.all([
      supabase.from("ward_units").select("*").order("sort_order"),
      supabase.from("ward_beds").select("*").order("sort_order"),
      supabase.from("ward_admissions").select("*").eq("status", "active"),
    ]);

    setUnits((u.data as WardUnit[]) || []);
    setBeds((b.data as WardBed[]) || []);
    const adm = (a.data as WardAdmission[]) || [];
    setAdmissions(adm);

    if (adm.length) {
      const { data: rounds } = await supabase
        .from("ward_rounds")
        .select("*")
        .eq("round_date", todayISO())
        .in("admission_id", adm.map((x) => x.id));
      const map: Record<string, WardRound> = {};
      ((rounds as WardRound[]) || []).forEach((r) => { map[r.admission_id] = r; });
      setTodayRounds(map);
    } else {
      setTodayRounds({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createUnit = useCallback(async (name: string, kind: string, bedCount: number) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("ward_units")
      .insert({ user_id: userId, name, kind, sort_order: units.length })
      .select()
      .single();
    if (error || !data) throw error;
    const rows = Array.from({ length: Math.max(0, bedCount) }, (_, i) => ({
      user_id: userId,
      unit_id: (data as WardUnit).id,
      label: String(i + 1),
      sort_order: i,
    }));
    if (rows.length) await supabase.from("ward_beds").insert(rows);
    await load();
  }, [userId, units.length, load]);

  const updateUnit = useCallback(async (id: string, patch: Partial<WardUnit>) => {
    await supabase.from("ward_units").update(patch).eq("id", id);
    await load();
  }, [load]);

  const deleteUnit = useCallback(async (id: string) => {
    await supabase.from("ward_units").delete().eq("id", id);
    await load();
  }, [load]);

  const addBeds = useCallback(async (unitId: string, count: number) => {
    if (!userId) return;
    const existing = beds.filter((b) => b.unit_id === unitId).length;
    const rows = Array.from({ length: Math.max(0, count) }, (_, i) => ({
      user_id: userId,
      unit_id: unitId,
      label: String(existing + i + 1),
      sort_order: existing + i,
    }));
    if (rows.length) await supabase.from("ward_beds").insert(rows);
    await load();
  }, [userId, beds, load]);

  const renameBed = useCallback(async (bedId: string, label: string) => {
    await supabase.from("ward_beds").update({ label }).eq("id", bedId);
    await load();
  }, [load]);

  const deleteBed = useCallback(async (bedId: string) => {
    await supabase.from("ward_beds").delete().eq("id", bedId);
    await load();
  }, [load]);

  const admitPatient = useCallback(async (bed: WardBed, payload: Partial<WardAdmission>) => {
    if (!userId) return;
    const { error } = await supabase.from("ward_admissions").insert({
      user_id: userId,
      bed_id: bed.id,
      unit_id: bed.unit_id,
      patient_name: payload.patient_name || "Paciente",
      date_of_birth: payload.date_of_birth || null,
      record_number: payload.record_number || null,
      admitted_on: payload.admitted_on || todayISO(),
      main_diagnosis: payload.main_diagnosis || null,
      comorbidities: payload.comorbidities || null,
      notes: payload.notes || null,
      status: "active",
    });
    if (error) throw error;
    await load();
  }, [userId, load]);

  const updateAdmission = useCallback(async (id: string, patch: Partial<WardAdmission>) => {
    const { error } = await supabase.from("ward_admissions").update(patch).eq("id", id);
    if (error) throw error;
    await load();
  }, [load]);

  const movePatient = useCallback(async (admission: WardAdmission, toBed: WardBed, reason?: string) => {
    if (!userId) return;
    const fromBed = beds.find((b) => b.id === admission.bed_id);
    const { error } = await supabase
      .from("ward_admissions")
      .update({ bed_id: toBed.id, unit_id: toBed.unit_id })
      .eq("id", admission.id);
    if (error) throw error;
    await supabase.from("ward_movements").insert({
      user_id: userId,
      admission_id: admission.id,
      from_bed_id: fromBed?.id ?? null,
      to_bed_id: toBed.id,
      from_label: fromBed?.label ?? null,
      to_label: toBed.label,
      reason: reason || null,
    });
    await load();
  }, [userId, beds, load]);

  const dischargePatient = useCallback(async (admissionId: string, summary?: string) => {
    const { error } = await supabase
      .from("ward_admissions")
      .update({
        status: "discharged",
        discharged_on: todayISO(),
        discharge_summary: summary || null,
        bed_id: null,
      })
      .eq("id", admissionId);
    if (error) throw error;
    await load();
  }, [load]);

  return {
    userId,
    units,
    beds,
    admissions,
    todayRounds,
    loading,
    reload: load,
    createUnit,
    updateUnit,
    deleteUnit,
    addBeds,
    renameBed,
    deleteBed,
    admitPatient,
    updateAdmission,
    movePatient,
    dischargePatient,
  };
}
