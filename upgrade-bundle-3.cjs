const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Could not find src/App.jsx. Make sure this script is inside your project folder.");
}

let source = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `App-before-bundle-3-client-dashboard-${Date.now()}.jsx`
);

fs.copyFileSync(appPath, backupPath);

let changed = false;

if (!source.includes('{ id: "Client", icon: Users }')) {
  const tabsNeedle = `    { id: "Home", icon: Home },
    { id: "Coach", icon: ShieldCheck },`;

  const tabsReplacement = `    { id: "Home", icon: Home },
    { id: "Client", icon: Users },
    { id: "Coach", icon: ShieldCheck },`;

  if (!source.includes(tabsNeedle)) {
    throw new Error("Could not find the tabs section to add the Client tab.");
  }

  source = source.replace(tabsNeedle, tabsReplacement);
  changed = true;
}

if (!source.includes('{activeTab === "Client" &&')) {
  const renderNeedle = `          {activeTab === "Coach" && (`;

  const renderReplacement = `          {activeTab === "Client" && (
            <ClientDashboardScreen
              clients={clients}
              selectedClientProfileId={selectedClientProfileId}
              setSelectedClientProfileId={setSelectedClientProfileId}
              savedPlans={savedPlans}
              workoutLogs={workoutLogs}
              conversations={conversations}
              openTrackerForClient={openTrackerForClient}
              openMessagesForClient={openMessagesForClient}
              openPlansForClient={openPlansForClient}
              markClientMessagesRead={markClientMessagesRead}
            />
          )}

          {activeTab === "Coach" && (`;

  if (!source.includes(renderNeedle)) {
    throw new Error("Could not find the Coach screen render area to insert Client Dashboard.");
  }

  source = source.replace(renderNeedle, renderReplacement);
  changed = true;
}

if (!source.includes("function ClientDashboardScreen(")) {
  const componentNeedle = `function CoachScreen(`;

  const clientDashboardComponent = `function ClientDashboardScreen({
  clients,
  selectedClientProfileId,
  setSelectedClientProfileId,
  savedPlans,
  workoutLogs,
  conversations,
  openTrackerForClient,
  openMessagesForClient,
  openPlansForClient,
  markClientMessagesRead,
}) {
  const [clientDashboardNotice, setClientDashboardNotice] = useState("");

  const selectedClient =
    clients.find((client) => client.id === selectedClientProfileId) || clients[0];

  const selectedPlans = selectedClient
    ? savedPlans.filter((plan) => plan.clientId === selectedClient.id)
    : [];

  const selectedLogs = selectedClient
    ? workoutLogs.filter((log) => log.clientId === selectedClient.id)
    : [];

  const selectedConversation = selectedClient
    ? conversations.find((conversation) => conversation.clientId === selectedClient.id)
    : null;

  const selectedMessages = selectedConversation?.messages || [];

  const clientUnreadCount = selectedMessages.filter(
    (message) => message.unreadForClient
  ).length;

  return (
    <div>
      <SectionHeader
        eyebrow="Client Portal"
        title="Client Dashboard"
        description="Client-facing view for assigned plans, workout history, messages, and quick access to tracking. Frontend-only for now."
      />

      {!selectedClient ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-bold text-white/60">
            Add a client first to use the Client Dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {clientDashboardNotice && (
            <p className="rounded-2xl border border-[#00BF63]/30 bg-[#00BF63]/10 p-4 text-sm font-bold text-[#00BF63]">
              {clientDashboardNotice}
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Assigned Plans" value={selectedPlans.length} />
            <StatCard label="Workout Logs" value={selectedLogs.length} />
            <StatCard
              label="Completed"
              value={selectedLogs.filter((log) => log.status === "completed").length}
            />
            <StatCard label="Client Unread" value={clientUnreadCount} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  Client Dashboard Selector
                </h3>

                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-white/50">
                  Client Dashboard Client
                </label>

                <select
                  aria-label="Client Dashboard Client"
                  value={selectedClient.id}
                  onChange={(event) => {
                    setSelectedClientProfileId(event.target.value);
                    setClientDashboardNotice("");
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#00BF63]"
                >
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>

                <div className="mt-4 space-y-3">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientProfileId(client.id);
                        setClientDashboardNotice("");
                      }}
                      className={\`w-full rounded-2xl border p-4 text-left transition \${
                        selectedClient.id === client.id
                          ? "border-[#00BF63] bg-[#00BF63]/10"
                          : "border-white/10 bg-black/40 hover:border-[#00BF63]/60"
                      }\`}
                    >
                      <p className="font-black">{client.name}</p>
                      <p className="mt-1 text-sm text-white/55">{client.email}</p>
                      <p className="mt-2 text-xs font-black uppercase tracking-wide text-[#00BF63]">
                        {client.status}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#00BF63]">
                  Client Portal Summary
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase">
                  {selectedClient.name}
                </h3>
                <p className="mt-1 text-sm text-white/55">{selectedClient.email}</p>
                <p className="mt-3 inline-flex rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase text-[#00BF63]">
                  {selectedClient.status}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openTrackerForClient(selectedClient.id)}
                    className="rounded-full bg-[#00BF63] px-5 py-3 text-sm font-black uppercase text-black transition hover:bg-white"
                  >
                    Open Tracker
                  </button>

                  <button
                    type="button"
                    onClick={() => openMessagesForClient(selectedClient.id)}
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                  >
                    Open Messages
                  </button>

                  <button
                    type="button"
                    onClick={() => openPlansForClient(selectedClient.id)}
                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-black uppercase text-white transition hover:border-[#00BF63] hover:text-[#00BF63]"
                  >
                    View Plans
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      markClientMessagesRead(selectedClient.id);
                      setClientDashboardNotice("Client unread messages marked as read.");
                    }}
                    className="rounded-full border border-[#00BF63]/40 bg-[#00BF63]/10 px-5 py-3 text-sm font-black uppercase text-[#00BF63] transition hover:bg-[#00BF63] hover:text-black"
                  >
                    Mark Client Read
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  Assigned Plans
                </h3>

                {selectedPlans.length === 0 ? (
                  <p className="text-sm font-bold text-white/55">
                    No plans assigned to this client yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {selectedPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="rounded-2xl border border-white/10 bg-black/40 p-4"
                      >
                        <h4 className="text-lg font-black uppercase">
                          {plan.planName}
                        </h4>
                        <p className="mt-1 text-sm text-white/65">
                          {plan.planName} assigned to {plan.clientName}
                        </p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/40">
                          Created {plan.createdAt}
                        </p>

                        <div className="mt-3 space-y-3">
                          {plan.days.map((day) => (
                            <div
                              key={day.id}
                              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                            >
                              <p className="font-black text-[#00BF63]">
                                {day.name}
                              </p>
                              <p className="mt-1 text-sm text-white/55">
                                {day.exercises.length} exercise(s)
                              </p>

                              <div className="mt-2 space-y-2">
                                {day.exercises.map((exercise) => (
                                  <div key={exercise.id} className="text-sm text-white/70">
                                    <p className="font-bold text-white">
                                      {exercise.exerciseName}
                                    </p>
                                    <p>Sets: {exercise.sets}</p>
                                    <p>Reps or Time: {exercise.repsOrTime}</p>
                                    <p>Weight Guidance: {exercise.weightGuidance}</p>
                                    <p>Rest Period: {exercise.rest}</p>
                                    {exercise.notes && <p>Coach Notes: {exercise.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  Workout History
                </h3>

                {selectedLogs.length === 0 ? (
                  <p className="text-sm font-bold text-white/55">
                    No workout logs for this client yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {selectedLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-white/10 bg-black/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-black uppercase">
                              {log.dayName}
                            </h4>
                            <p className="mt-1 text-sm text-white/65">
                              {log.clientName} {log.status} {log.dayName} from{" "}
                              {log.planName}
                            </p>
                          </div>

                          <span className="rounded-full bg-[#00BF63]/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#00BF63]">
                            {log.status}
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/40">
                          {log.submittedAt}
                        </p>

                        {log.skipReason && (
                          <p className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm font-bold text-yellow-200">
                            Skip Reason: {log.skipReason}
                          </p>
                        )}

                        <div className="mt-4 space-y-3">
                          {log.entries?.map((entry) => (
                            <div
                              key={entry.exerciseId}
                              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70"
                            >
                              <p className="text-base font-black text-white">
                                {entry.exerciseName}
                              </p>
                              <p>Actual Weight Used {entry.actualWeight || "N/A"}</p>
                              <p>Sets Completed {entry.setsCompleted || "N/A"}</p>
                              <p>Reps Completed {entry.repsCompleted || "N/A"}</p>
                              <p>Time Completed {entry.timeCompleted || "N/A"}</p>
                              <p>Actual Rest Used {entry.restUsed || "N/A"}</p>
                              {entry.substitution && (
                                <p>Exercise Substitution {entry.substitution}</p>
                              )}
                              {entry.notes && <p>Client Notes {entry.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  Client Messages
                </h3>

                {selectedMessages.length === 0 ? (
                  <p className="text-sm font-bold text-white/55">
                    No messages for this client yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-2xl border border-white/10 bg-black/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-black text-[#00BF63]">
                            {message.sender}
                          </p>
                          <p className="text-xs text-white/40">{message.sentAt}</p>
                        </div>

                        {message.unreadForClient && (
                          <span className="mt-2 inline-flex rounded-full bg-[#00BF63] px-2 py-1 text-xs font-black uppercase text-black">
                            Unread Client
                          </span>
                        )}

                        {message.unreadForCoach && (
                          <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-xs font-black uppercase text-black">
                            Unread Coach
                          </span>
                        )}

                        <p className="mt-3 text-sm text-white/70">{message.body}</p>
                        <p className="mt-2 text-xs font-bold text-white/45">
                          {message.sender} message in {selectedClient.name}'s conversation:{" "}
                          {message.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                <h3 className="mb-4 text-xl font-black uppercase">
                  All Client Dashboard Activity
                </h3>

                <div className="space-y-3">
                  {savedPlans.map((plan) => (
                    <p
                      key={plan.id}
                      className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/65"
                    >
                      {plan.planName} assigned to {plan.clientName}
                    </p>
                  ))}

                  {conversations.flatMap((conversation) =>
                    conversation.messages.map((message) => (
                      <p
                        key={\`\${conversation.clientId}-\${message.id}\`}
                        className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/65"
                      >
                        {message.sender} message in {conversation.clientName}'s conversation:{" "}
                        {message.body}
                      </p>
                    ))
                  )}

                  {workoutLogs.map((log) => (
                    <p
                      key={log.id}
                      className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/65"
                    >
                      {log.clientName} {log.status} {log.dayName} from {log.planName}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

`;

  if (!source.includes(componentNeedle)) {
    throw new Error("Could not find CoachScreen location to insert ClientDashboardScreen.");
  }

  source = source.replace(componentNeedle, `${clientDashboardComponent}${componentNeedle}`);
  changed = true;
}

if (!changed) {
  console.log("Bundle 3 Client Dashboard was already installed. No changes needed.");
} else {
  fs.writeFileSync(appPath, source, "utf8");
  console.log("Bundle 3 Client Dashboard installed successfully.");
  console.log(`Backup saved at: ${backupPath}`);
}