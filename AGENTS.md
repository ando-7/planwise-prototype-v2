<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- UI primitives in `src/components/ui/{button,input,label,textarea,dialog,alert-dialog}.tsx` are the Base UI (`@base-ui/react`) variants carried over from the original Planwise app; use their `render` prop instead of Radix `asChild`. Why: the migrated screens depend on that API.
- Task rules (progress averaging, subtask deadline limits, delete protection, contributor rules, booking/plan validation) live in `src/lib/tasks.ts` with tests in `src/lib/tasks.test.ts`; week-grid helpers live in `src/lib/planning.ts` with `planning.test.ts`. Why: keeps business rules testable outside components.
- App data (tasks, people, signed-in person) lives in `PlannerProvider` (`src/components/planner/planner-provider.tsx`), mounted once in `__root.tsx`; its actions re-check permissions and return a German error string or null. Why: dashboard and week planning share one state across navigation.
- Use native `<select>` inside Base UI dialogs, not the Radix Select. Why: Radix portals conflict with the Base UI dialog focus trap.
