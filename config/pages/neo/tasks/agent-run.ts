import { getMyAgents } from "@/hooks/pages/neo/use-my-agents";
import type { NeoTask } from "@/types/pages/neo";
import { has } from "@/utils/pages/neo";

/**
 * Run one of your own agents (24 Oct 2026). Agents run in the chat only:
 * the Run button on an agent's details starts this. Neo says what the agent
 * will do, with what, and how it was set up. In this prototype the
 * three-way reconciliation is the one agent that runs end to end; any
 * other stops here, and says so.
 *
 * DEV: POST /api/neo/agents/:id/runs.
 */
const agentRun: NeoTask = {
  id: "agent-run",
  title: "Run an agent",
  match: (p) => (has(p, /^\s*run my agent\b/i) ? 90 : 0),
  run: async (api) => {
    const name = api.prompt.replace(/^\s*run my agent[:\s]*/i, "").trim();
    const a = getMyAgents().find(
      (x) => x.name.toLowerCase() === name.toLowerCase()
    );
    if (!a) {
      await api.say(`I couldn't find an agent called **${name}** in My agents.`);
      return "Agent not found";
    }
    if (a.status !== "active") {
      await api.say(
        `**${a.name}** is ${a.status === "draft" ? "a draft" : "paused"}. Switch it on from My agents, then run it.`
      );
      return "Agent is not on";
    }
    api.stage(1);
    await api.say(
      `Running **${a.name}**. It will ${a.goal.toLowerCase()}, using ${a.data}. ${a.access}.`
    );
    await api.say(
      "In this prototype only the three-way reconciliation runs from start to finish, so I stop here. The agent keeps its settings."
    );
    return "Agent shown";
  },
};

export default agentRun;
