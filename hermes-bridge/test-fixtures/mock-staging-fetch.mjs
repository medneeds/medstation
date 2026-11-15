/**
 * Test-only preloader. Mocks external fetch in a fresh stdio MCP subprocess.
 * Runs ONLY under Node's --import flag in CI; never loaded by production code.
 */
globalThis.fetch = async (url, init) => {
  if (url !== "https://stagingprojectref001.supabase.co/functions/v1/ai-core-hermes-sandbox" ||
      init?.method !== "POST" || init?.redirect !== "error" ||
      init?.headers?.Authorization !== "Bearer short-lived-admin-jwt" ||
      init?.headers?.apikey !== "publishable-test-key") {
    throw new Error("unexpected request target or credentials");
  }
  const request = JSON.parse(init.body);
  if (Object.keys(request).sort().join(",") !== "requestId,workflow" ||
      request.workflow !== "admission-review" || request.requestId !== "synthetic_001") {
    throw new Error("unexpected request payload");
  }
  return new Response(JSON.stringify({
    environment: "synthetic-staging",
    // Explicitly include an unexpected key to prove output allowlisting.
    hidden_patient_data: "MUST_NEVER_BE_EMITTED",
    simulation: {
      ok: true,
      mode: "simulation",
      workflow: "admission-review",
      requestId: request.requestId,
      requiresMedicalReview: true,
      steps: [
        { tool: "clinical.document", target: "clinicus", status: "simulated" },
        { tool: "clinical.labs", target: "examinus", status: "simulated" },
      ],
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};
