export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0c0c0f] text-zinc-200">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="mb-8 text-2xl font-bold text-white">Privacy Policy</h1>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-400">
          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-200">
              All Processing Is Local
            </h2>
            <p>
              LUT Studio performs all image processing entirely within your
              browser. Your images are never uploaded to any server. No data is
              transmitted anywhere outside of your device.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-200">
              No Tracking
            </h2>
            <p>
              We do not use analytics, tracking scripts, cookies, or any
              third-party tracking services. We do not collect personal
              information of any kind.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-200">
              No Data Storage
            </h2>
            <p>
              The only data stored on your device is your filter adjustment
              preferences, saved to your browser&apos;s local storage so you can
              resume where you left off. This data never leaves your device and
              can be cleared at any time by clearing your browser data.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-200">
              Third-Party Services
            </h2>
            <p>
              LUT Studio does not integrate with any third-party services,
              APIs, or external resources that could access your data.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-zinc-200">
              Changes
            </h2>
            <p>
              If this policy ever changes, we will update this page. Since no
              data is collected, any changes would only clarify our practices
              further.
            </p>
          </section>

          <p className="pt-4 text-xs text-zinc-500">
            Last updated: April 2026
          </p>
        </div>

        <a
          href="/"
          className="mt-12 inline-block rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          Back to LUT Studio
        </a>
      </div>
    </div>
  );
}
