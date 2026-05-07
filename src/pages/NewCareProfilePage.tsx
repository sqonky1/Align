import { PageHeader } from "../components/layout/PageHeader"

export function NewCareProfilePage() {
  return (
    <section className="page-section">
      <PageHeader
        eyebrow="Create care profile"
        title="Capture senior care needs in a structured brief."
        description="This route is reserved for the full intake form. The next phase will wire in the actual fields, upload area, and live summary."
      />

      <section className="editor-stage">
        <article className="editor-canvas">
          <div className="section-header section-header-tight">
            <div>
              <p className="panel-label">Form column</p>
              <h2>Senior needs intake</h2>
            </div>
          </div>
          <p>
            This section will hold the structured fields for conditions, daily care tasks,
            mobility, medication support, and household context.
          </p>
        </article>

        <aside className="editor-notes">
          <p className="panel-label">Profile summary</p>
          <h2>Live care snapshot</h2>
          <p>
            A sticky summary panel will sit here so employers can review the care brief as
            they build it.
          </p>
        </aside>
      </section>
    </section>
  )
}
