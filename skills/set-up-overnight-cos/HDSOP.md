# Set up Overnight CoS: the map

**What it is for.** One sitting turns the plugin into the operator's own: their accounts, their Notion, their phone, their schedule.

**The flow.** Check connectors, interview, build the Notion pieces, write and check the settings file, connect the phone queue over Tailscale, schedule three jobs, and remind them about power.

**Where it branches.** Slack and Calendar are optional and skipped cleanly. An existing tasks database can be reused. A settings file that already exists is edited, not replaced.

**What stays human.** Signing in to Tailscale on both devices and turning on HTTPS certificates. Pressing "Run now" once per job to approve the connectors. Keeping the Mac on the charger overnight.

**What it never does.** Put anything the operator says into the plugin itself. It all goes into their workspace and their Notion.
