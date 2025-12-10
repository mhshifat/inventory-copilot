import { json, type ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import * as Sentry from "@sentry/remix";

// This is a test route to verify Sentry integration
// Access it at /app/test-sentry

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const errorType = formData.get("errorType");

  try {
    if (errorType === "server") {
      // Test server-side error
      throw new Error("Test server-side error from Sentry test route!");
    }

    if (errorType === "manual") {
      // Test manual error capture
      Sentry.captureMessage("Manual test message from Sentry", {
        level: "info",
        tags: { test: "manual-capture" },
      });
      return json({ message: "Manual error captured!" });
    }

    return json({ message: "Unknown error type" });
  } catch (error) {
    // Explicitly capture and re-throw
    Sentry.captureException(error);
    throw error;
  }
}

export default function TestSentry() {
  const actionData = useActionData<typeof action>();

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Sentry Integration Test</h1>
      <p>Use these buttons to test different types of errors:</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px", marginTop: "2rem" }}>
        {/* Client-side error */}
        <button
          onClick={() => {
            throw new Error("Test client-side error!");
          }}
          style={{
            padding: "1rem",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          Trigger Client-Side Error
        </button>

        {/* Server-side error */}
        <Form method="post">
          <input type="hidden" name="errorType" value="server" />
          <button
            type="submit"
            style={{
              padding: "1rem",
              backgroundColor: "#ea580c",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Trigger Server-Side Error
          </button>
        </Form>

        {/* Manual capture */}
        <Form method="post">
          <input type="hidden" name="errorType" value="manual" />
          <button
            type="submit"
            style={{
              padding: "1rem",
              backgroundColor: "#0891b2",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Test Manual Error Capture
          </button>
        </Form>

        {/* Promise rejection */}
        <button
          onClick={() => {
            Promise.reject(new Error("Test unhandled promise rejection!"));
          }}
          style={{
            padding: "1rem",
            backgroundColor: "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          Trigger Promise Rejection
        </button>

        {/* Add breadcrumb and then error */}
        <button
          onClick={() => {
            Sentry.addBreadcrumb({
              category: "test",
              message: "User clicked the breadcrumb test button",
              level: "info",
            });
            
            Sentry.setTag("test_type", "breadcrumb");
            
            setTimeout(() => {
              throw new Error("Test error with breadcrumbs!");
            }, 100);
          }}
          style={{
            padding: "1rem",
            backgroundColor: "#059669",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          Test Error with Breadcrumbs
        </button>
      </div>

      {actionData && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#d1fae5",
            borderRadius: "0.375rem",
          }}
        >
          <p style={{ margin: 0, color: "#065f46" }}>{actionData.message}</p>
        </div>
      )}

      <div style={{ marginTop: "3rem", padding: "1rem", backgroundColor: "#f3f4f6", borderRadius: "0.375rem" }}>
        <h2 style={{ marginTop: 0 }}>What to Check:</h2>
        <ol style={{ lineHeight: "1.75" }}>
          <li>Make sure SENTRY_DSN is set in your .env file</li>
          <li>Click each button to test different error types</li>
          <li>Check your browser console for error logs</li>
          <li>
            Go to your Sentry dashboard at{" "}
            <a href="https://sentry.io" target="_blank" rel="noopener noreferrer">
              https://sentry.io
            </a>
          </li>
          <li>Navigate to Issues → you should see the test errors</li>
          <li>Each error should have full stack traces and context</li>
        </ol>
        
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
          <strong>Note:</strong> In development mode, errors are logged to console but may not be sent to Sentry
          (check the beforeSend configuration). Set SENTRY_ENVIRONMENT=production to test actual error reporting.
        </p>
      </div>
    </div>
  );
}
