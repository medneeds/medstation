/**
 * Agregação de respostas do onboarding (sem PII).
 *
 * Esta função é a fonte da verdade da lógica de agregação e é espelhada
 * dentro da Edge Function `admin-posthog` (view=onboarding), que executa a
 * mesma contagem no servidor com service role. Qualquer mudança aqui deve ser
 * replicada lá.
 */

export interface OnboardingRow {
  completed_at: string | null;
  routine_pains: string[] | null;
  work_settings: string[] | null;
  primary_goals: string[] | null;
  primary_path: string | null;
  recommended_tools: string[] | null;
}

export interface DistributionItem {
  key: string;
  count: number;
  percent: number;
}

export interface OnboardingInsights {
  completedTotal: number;
  pendingTotal: number;
  completionPercent: number | null;
  surveyRespondents: number;
  legacyCompletedWithoutSurvey: number;
  routinePains: DistributionItem[];
  workSettings: DistributionItem[];
  primaryGoals: DistributionItem[];
  primaryPaths: DistributionItem[];
  recommendedTools: DistributionItem[];
}

function distribution(
  lists: (string[] | null | undefined)[],
  respondents: number,
  limit?: number,
): DistributionItem[] {
  const counts = new Map<string, number>();
  for (const list of lists) {
    if (!list) continue;
    // Uma resposta repetida na mesma linha conta apenas uma vez.
    for (const key of new Set(list.filter((v) => typeof v === "string" && v.length > 0))) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const items = [...counts.entries()]
    .map(([key, count]) => ({
      key,
      count,
      percent: respondents ? Math.round((count / respondents) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return limit ? items.slice(0, limit) : items;
}

const hasAnswers = (r: OnboardingRow) =>
  (r.routine_pains?.length ?? 0) > 0 ||
  (r.work_settings?.length ?? 0) > 0 ||
  (r.primary_goals?.length ?? 0) > 0;

export function aggregateOnboarding(rows: OnboardingRow[]): OnboardingInsights {
  const completed = rows.filter((r) => !!r.completed_at);
  const pending = rows.length - completed.length;
  const respondentsRows = completed.filter(hasAnswers);
  const respondents = respondentsRows.length;

  return {
    completedTotal: completed.length,
    pendingTotal: pending,
    completionPercent: rows.length
      ? Math.round((completed.length / rows.length) * 1000) / 10
      : null,
    surveyRespondents: respondents,
    legacyCompletedWithoutSurvey: completed.length - respondents,
    routinePains: distribution(respondentsRows.map((r) => r.routine_pains), respondents),
    workSettings: distribution(respondentsRows.map((r) => r.work_settings), respondents),
    primaryGoals: distribution(respondentsRows.map((r) => r.primary_goals), respondents),
    primaryPaths: distribution(
      respondentsRows.map((r) => (r.primary_path ? [r.primary_path] : [])),
      respondents,
    ),
    recommendedTools: distribution(
      respondentsRows.map((r) => r.recommended_tools),
      respondents,
      5,
    ),
  };
}
