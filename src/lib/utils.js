export function UTCtoMsec(dateString) {
  const regex = new RegExp(/^(\d{4})\/([01]\d)\/([0-3]\d) ([012]\d):([0-5]\d):([0-5]\d)/);

  const s = regex.exec(dateString);
  const ms = Date.UTC(s[1], s[2], s[3], s[4], s[5], s[6]);

  if (isNaN(ms)) {
    return null;
  }
  const d = new Date(ms);
  const check = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
                 d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
  for (let i = 0; i < check.length; i++) {
    if (check[i] !== parseInt(s[i+1])) {
      return null;
    }
  }

  return ms;
}
