from pathlib import Path
from datetime import datetime
import re
import sys

ROOT = Path.cwd()

def is_ignored(path):
    ignored = {"node_modules", "dist", "build", ".git", ".next", "coverage"}
    return any(part in ignored for part in path.parts)

candidates = []
for path in ROOT.rglob("App.jsx"):
    if is_ignored(path):
        continue
    try:
        text = path.read_text(encoding="utf-8")
    except Exception:
        continue
    if "No Limit Fitness" in text and "export default function App" in text:
        candidates.append(path)

if not candidates:
    print("ERROR: Could not find the No Limit Fitness App.jsx file.")
    sys.exit(1)

app_path = sorted(candidates, key=lambda p: len(str(p)))[0]
text = app_path.read_text(encoding="utf-8")
original = text

backup_path = app_path.with_name(
    app_path.name + ".bundle12n.backup-" + datetime.now().strftime("%Y%m%d-%H%M%S")
)
backup_path.write_text(original, encoding="utf-8")

changes = []

def regex_replace(pattern, replacement, label, count=1):
    global text
    new_text, replaced = re.subn(pattern, replacement, text, count=count, flags=re.DOTALL)
    if replaced:
        text = new_text
        changes.append(label)
        print("UPDATED:", label)
    else:
        print("SKIPPED:", label)

# 1. Wire the ClientsScreen action props correctly.
regex_replace(
    r'''              updateClientStatus=\{updateClientStatus\}
\s*clientActionNotice=\{clientActionNotice\}
\s*onUnassignClient=\{unassignClientFromCoach\}
\s*fullDeleteArchivedClient=\{fullDeleteArchivedClient\}
\s*/>''',
    '''              updateClientStatus={updateClientStatus}
              safeDeleteClient={safeDeleteClient}
              clientActionNotice={clientActionNotice}
              onAssignClient={assignClientToCoach}
              onArchiveClient={archiveClientForCoach}
              onReactivateClient={reactivateClientForCoach}
              onViewArchivedClient={viewArchivedClientForCoach}
              onUnassignClient={unassignClientFromCoach}
              fullDeleteArchivedClient={fullDeleteArchivedClient}
            />''',
    "Wire ClientsScreen archive/assign/reactivate/full-delete props"
)

# 2. Remove the duplicate old CoachClientAssignmentPanel render.
regex_replace(
    r'''        \{/\* NLF_COACH_ASSIGNMENT_PANEL_START \*/\}
[\s\S]*?        \{/\* NLF_COACH_ASSIGNMENT_PANEL_END \*/\}''',
    '''        {/* Bundle 12N: ClientsScreen is now the single coach client-management surface. */}''',
    "Remove duplicate coach assignment panel render"
)

# 3. Convert Safe Delete into archive-only behavior.
regex_replace(
    r'''  function safeDeleteClient\(clientId\) \{
[\s\S]*?
  function updateTrackingDraft''',
    '''  function safeDeleteClient(clientId) {
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;

    const archivedAt = new Date().toISOString();

    const fallbackClient =
      clients.find(
        (item) => item.id !== clientId && getClientCoachingStatus(item) === "active"
      ) ||
      clients.find((item) => item.id !== clientId) ||
      null;

    setClients((current) =>
      current.map((item) =>
        item.id === clientId
          ? {
              ...normalizeClientCoachingRecord(item),
              coachingStatus: "archived",
              status: "Archived",
              archivedAt,
              archiveReason: item.archiveReason || "Archived by Safe Delete",
            }
          : item
      )
    );

    setSelectedClientProfileId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );

    setTrackerClientId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );

    setSelectedConversationId((current) =>
      current === clientId ? fallbackClient?.id || "" : current
    );

    setPlanDraft((current) => ({
      ...current,
      clientId:
        current.clientId === clientId
          ? fallbackClient?.id || ""
          : current.clientId,
    }));

    setClientActionNotice(
      client.name +
        " archived. Safe Delete now preserves records and removes the client from active workflow."
    );
  }

  function updateTrackingDraft''',
    "Change Safe Delete to archive-only behavior"
)

# 4. Remove duplicated muscles/equipment block inside ExerciseCard.
duplicate_summary_pattern = r'''(<div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-white/70">\s*
        <p>\s*
          <span className="font-black text-white">Muscles worked:</span> \{exercise\.muscles\}\s*
        </p>\s*
        <p>\s*
          <span className="font-black text-white">Equipment:</span> \{exercise\.equipment\}\s*
        </p>\s*
      </div>\s*){2}'''

match = re.search(duplicate_summary_pattern, text, flags=re.DOTALL)
if match:
    text = re.sub(duplicate_summary_pattern, match.group(1), text, count=1, flags=re.DOTALL)
    changes.append("Remove duplicate ExerciseCard muscles/equipment block")
    print("UPDATED: Remove duplicate ExerciseCard muscles/equipment block")
else:
    print("SKIPPED: Remove duplicate ExerciseCard muscles/equipment block")

# 5. Update bundle marker if present.
if "// Bundle 2C update complete marker" in text:
    text = text.replace(
        "// Bundle 2C update complete marker",
        "// Bundle 12N update complete marker",
        1
    )
    changes.append("Update bundle marker")
    print("UPDATED: Update bundle marker")
elif "// Bundle 12N update complete marker" not in text:
    text = text.rstrip() + "\\n\\n// Bundle 12N update complete marker\\n"
    changes.append("Add bundle marker")
    print("UPDATED: Add bundle marker")

if text == original:
    print("No file changes were made.")
    print("Backup still saved at:", backup_path)
    sys.exit(0)

app_path.write_text(text, encoding="utf-8")

print("")
print("Bundle 12N patch complete.")
print("Updated file:", app_path)
print("Backup file:", backup_path)
print("Changes applied:", len(changes))
for change in changes:
    print("-", change)
