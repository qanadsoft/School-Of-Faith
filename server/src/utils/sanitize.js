const escapeMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function sanitizeText(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => escapeMap[char]);
}
