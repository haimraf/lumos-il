export type ContactReplyEntry = {
  id: string;
  subject: string;
  html: string;
  text: string;
  sent_at: string;
  actor_id: string | null;
  actor_name: string | null;
  recipient_email: string | null;
  delivery_id: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getContactReplyEntries(metadata: unknown): ContactReplyEntry[] {
  if (!isRecord(metadata) || !Array.isArray(metadata.responses)) return [];

  return metadata.responses
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      subject: typeof entry.subject === "string" ? entry.subject : "",
      html: typeof entry.html === "string" ? entry.html : "",
      text: typeof entry.text === "string" ? entry.text : "",
      sent_at: typeof entry.sent_at === "string" ? entry.sent_at : "",
      actor_id: typeof entry.actor_id === "string" ? entry.actor_id : null,
      actor_name: typeof entry.actor_name === "string" ? entry.actor_name : null,
      recipient_email: typeof entry.recipient_email === "string" ? entry.recipient_email : null,
      delivery_id: typeof entry.delivery_id === "string" ? entry.delivery_id : null,
    }))
    .filter((entry) => entry.id && entry.subject && entry.sent_at);
}

export function appendContactReplyEntry(metadata: unknown, entry: ContactReplyEntry) {
  const base = isRecord(metadata) ? metadata : {};
  const existingResponses = getContactReplyEntries(metadata);

  return {
    ...base,
    responses: [...existingResponses, entry],
  };
}

export function buildDefaultContactReplySubject(subject?: string | null) {
  const trimmed = subject?.trim();
  return trimmed ? `מענה מצוות LUMOS IL: ${trimmed}` : "מענה מצוות LUMOS IL";
}

export function buildDefaultContactReplyBody(name?: string | null) {
  const safeName = name?.trim() ? escapeHtml(name.trim()) : "";
  const greeting = safeName ? `היי ${safeName},` : "היי,";

  return [
    `<p>${greeting}</p>`,
    "<p>תודה ששלחת לנו ינשוף דרך ההינשופייה.</p>",
    "<p>עברנו על הפנייה שלך, ואנחנו חוזרים אליך עם מענה מסודר:</p>",
    "<p><br></p>",
    "<p>בברכה,<br>צוות הטירה של LUMOS IL</p>",
  ].join("");
}
