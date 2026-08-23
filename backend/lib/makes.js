export function normalizeMakeInput(body = {}) {
  const note = String(body.note ?? "").trim();
  if (note.length > 500) throw Object.assign(new Error("Note must be 500 characters or fewer"), { status: 400 });

  let rawChanges = body.changes ?? [];
  if (typeof rawChanges === "string") {
    try {
      rawChanges = JSON.parse(rawChanges);
    } catch {
      throw Object.assign(new Error("Changes must be a valid list"), { status: 400 });
    }
  }
  if (!Array.isArray(rawChanges)) throw Object.assign(new Error("Changes must be a valid list"), { status: 400 });
  const changes = [...new Set(rawChanges.map((change) => String(change).trim()).filter(Boolean))];
  if (changes.length > 8 || changes.some((change) => change.length > 80)) {
    throw Object.assign(new Error("Choose up to 8 changes of 80 characters or fewer"), { status: 400 });
  }

  if (body.rating === undefined || body.rating === null || body.rating === "") {
    return { note: note || null, rating: null, changes };
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw Object.assign(new Error("Rating must be a whole number from 1 to 5"), { status: 400 });
  }
  return { note: note || null, rating, changes };
}
