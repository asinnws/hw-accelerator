export function MockStartupAlert({ reason }: { reason: string }) {
  return (
    <div className="startup-alert" role="alert">
      <p>The mock API couldn't start, so sessions can't load.</p>
      <p>
        Common causes: the page isn't on http://localhost or HTTPS, service workers are disabled (for example in a
        private window), or public/mockServiceWorker.js is missing. Fix the cause, then reload.
      </p>
      <p className="startup-alert__detail">Details: {reason}</p>
    </div>
  )
}
